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
            resolve(parseDot(fr.result));
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
    let links = [...l, ...r]; // TODO REALLY MERGE AND REMOVE DUPLICATES
    return links;
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
        // Avoid duplicates (not entirely right but will do)
        if (!artifacts[l.source].links.find(t => t.target === l.target)) {
            artifacts[l.source].links.push(l);
        }
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

    // Colorize Artifacts
    let groupKeys = Object.keys(groups);
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
