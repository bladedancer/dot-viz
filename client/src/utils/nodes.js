import chroma from 'chroma-js';

function color(index, domain) {
    return chroma(chroma.scale('Spectral').colors(domain)[index])
        .darken()
        .hex();
}

const readDot = (dotfile) => {
    return new Promise((resolve, reject) => {
        var fr = new FileReader();  
        fr.onload = () => {
            try {
                resolve(parseDot(fr.result));
            } catch (err) {
                reject(err);
            }
        };
        fr.onerror = reject;
        fr.readAsText(dotfile);
      });
}

const parseNode = (l) => {
    const id = l.split('"')[1].trim();

    let group = id.split(":")[0].trim();
    let artifactId = id.split(":")[1].trim();
    let packaging = id.split(":")[2].trim();

    return {
        id: group + ":" + artifactId,
        group: group,
        name: artifactId,
        packaging: packaging,
        links: [],
        color: color(1, 10) // todo
    };
}

const parseEdge = (l) => {
    const link = l.split(' -> ');
    
    const details = (e) => {
        const data = e.split('"')[1].trim();
        return {
            group: data.split(":")[0],
            name: data.split(":")[1],
            packaging: data.split(":")[2],
            scope: data.split(":")[3] 
        };
    }
    const toLink = (from, to) => {
        let fromDetails = details(from);
        let toDetails = details(to);
        return {
            source: fromDetails.group + ":" + fromDetails.name,
            target: toDetails.group + ":" + toDetails.name,
            linkType: toDetails.scope,
            size: 1,
            type: 'line',
            color:  "#000000",
            weight: 5,
        };
    };

    return toLink(link[0].trim(), link[1].trim())
}

const nodeToGroup = (n) => {
    return {
        id: n.group,
        group: n.group,
        name: n.group,
        links: n.links,
        color: n.color
    };  
}

const mergeLinks = (l, r) => {
    const merged = [...l];
    r.forEach(link => {
        if (!merged.find(t => t.source === link.source && t.target === link.target && t.linkType === link.linkType)) {
            merged.push(link);
        }
    });
    return merged;
}

const parseDot = (dot) => {
    // Completely noddy but easier than trying to integrate a parser
    const lines = dot.split('\n');
   
    if (lines.length < 2) {
        return {
            groups: [],
            artifacts: [],
        };
    }

    let artifacts = {};
    let links = [];
    let inNodes = false;
    let inLinks = false;
    lines.forEach((l, i) => {
        if (i == 0 || i == lines.length - 1) {
            // Skip first and last line
            return;
        }

        if (!l.trim().length) {
            return;
        } else if (l.includes('// Node Definitions:')) {
            inNodes = true;
            inLinks = false;
            return;
        } else if (l.includes("// Edge Definitions:")) {
            inNodes = false;
            inLinks = true;
            return;
        }

        if (inNodes) {
            let n = parseNode(l);
            if (!artifacts[n.id]) {
                artifacts[n.id] = n;
            }
        } else if (inLinks) {
            links.push(parseEdge(l));
        }
    });

    // Compose Links
    links.forEach(l => {
        // Skip self-loops (can arise from classifier variants normalising to the same 2-part id)
        if (l.source === l.target) return;
        if (!artifacts[l.source]) return;
        if (!artifacts[l.source].links.find(t => t.target === l.target && t.linkType === l.linkType)) {
            artifacts[l.source].links.push(l);
        }
    });

    // Mark root nodes (nodes with no incoming edges)
    const targetIds = new Set(links.map(l => l.target));
    Object.keys(artifacts).forEach(k => {
        artifacts[k].isRoot = !targetIds.has(k);
    });

    // Extract Groups
    let groups = Object.keys(artifacts).map(k => artifacts[k]).reduce((prev, cur) => {
        let group = prev[cur.group];

        if (group != null) {
            // Merge the links
            group.links = mergeLinks(group.links, cur.links);
        } else {
            group = nodeToGroup(cur);
            prev[cur.group] = group;
        }

        return prev;
    }, {})
    let groupKeys = Object.keys(groups);

    // Add fake links between group members - to aid with clumping.
    groupKeys.forEach((g) => {
        let groupArtifacts = Object.values(artifacts).filter(a => a.group === g);
        for (let i = 1; i < groupArtifacts.length; i++) {
            for (let j = 0; j < groupArtifacts.length - 1; j++) {
                if (i === j) continue;
                groupArtifacts[i].links.push({
                    source: groupArtifacts[i].group + ":" + groupArtifacts[i].name,
                    target: groupArtifacts[j].group + ":" + groupArtifacts[j].name,
                    linkType: "grouping",
                    size: 1,
                    type: 'line',
                    color:  "#FF0000",
                    weight: 5,
                });
            }
        }
    });

    // Colorize Artifacts
    Object.keys(artifacts).forEach(a => {
        artifacts[a].color = color(groupKeys.indexOf(artifacts[a].group), groupKeys.length);
    });
    groupKeys.forEach((g, i) => {
        groups[g].color = color(i, groupKeys.length);
    });

    // Flatten 
    artifacts = Object.keys(artifacts).map(k => artifacts[k]);
    groups = Object.keys(groups).map(k => groups[k]);

    return {
        groups,
        artifacts,
    };
}

const nodify = async (dotfile) => {
    const dotData = await readDot(dotfile);
    return dotData;
};

export default nodify;
