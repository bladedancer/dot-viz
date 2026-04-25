import chroma from 'chroma-js';
import * as graphlibDot from '@dagrejs/graphlib-dot';

function color(index, domain) {
    return chroma(chroma.scale('Spectral').colors(domain)[index])
        .darken()
        .hex();
}

const parseDot = (text) => {
    const graph = graphlibDot.read(text);
    const nodeIds = graph.nodes();
    const edgeDefs = graph.edges();

    if (!nodeIds.length) {
        return { groups: [], artifacts: [] };
    }

    const artifacts = {};
    nodeIds.forEach((id) => {
        const parts = id.split(':');
        const group = parts[0];
        const name = parts[1] || id;
        const packaging = parts[2] || 'jar';
        const canonicalId = `${group}:${name}`;

        if (!artifacts[canonicalId]) {
            artifacts[canonicalId] = {
                id: canonicalId,
                group,
                name,
                packaging,
                links: [],
                color: '#888888',
                isRoot: true,
            };
        }
    });

    edgeDefs.forEach((edge) => {
        const fromParts = edge.v.split(':');
        const toParts = edge.w.split(':');
        const sourceId = `${fromParts[0]}:${fromParts[1] || edge.v}`;
        const targetId = `${toParts[0]}:${toParts[1] || edge.w}`;

        if (sourceId === targetId) return;
        if (!artifacts[sourceId] || !artifacts[targetId]) return;

        const edgeAttrs = graph.edge(edge.v, edge.w) || {};
        const linkType = edgeAttrs.style || edgeAttrs.label || 'compile';

        const alreadyExists = artifacts[sourceId].links.some(
            (l) => l.target === targetId && l.linkType === linkType
        );
        if (!alreadyExists) {
            artifacts[sourceId].links.push({
                source: sourceId,
                target: targetId,
                linkType,
                size: 1,
                type: 'line',
                color: '#000000',
                weight: 5,
            });
        }
    });

    const targetIds = new Set(edgeDefs.map((e) => {
        const parts = e.w.split(':');
        return `${parts[0]}:${parts[1] || e.w}`;
    }));
    Object.keys(artifacts).forEach((k) => {
        artifacts[k].isRoot = !targetIds.has(k);
    });

    const groups = Object.keys(artifacts).reduce((prev, key) => {
        const node = artifacts[key];
        if (prev[node.group]) {
            node.links.forEach((link) => {
                const exists = prev[node.group].links.some(
                    (l) => l.source === link.source && l.target === link.target && l.linkType === link.linkType
                );
                if (!exists) prev[node.group].links.push(link);
            });
        } else {
            prev[node.group] = {
                id: node.group,
                group: node.group,
                name: node.group,
                links: [...node.links],
                color: '#888888',
            };
        }
        return prev;
    }, {});

    const groupKeys = Object.keys(groups);

    groupKeys.forEach((g) => {
        const groupArtifacts = Object.values(artifacts).filter((a) => a.group === g);
        for (let i = 0; i < groupArtifacts.length; i++) {
            for (let j = 0; j < groupArtifacts.length; j++) {
                if (i === j) continue;
                groupArtifacts[i].links.push({
                    source: `${groupArtifacts[i].group}:${groupArtifacts[i].name}`,
                    target: `${groupArtifacts[j].group}:${groupArtifacts[j].name}`,
                    linkType: 'grouping',
                    size: 1,
                    type: 'line',
                    color: '#FF0000',
                    weight: 5,
                });
            }
        }
    });

    const groupIndex = Object.fromEntries(groupKeys.map((g, i) => [g, i]));
    Object.keys(artifacts).forEach((a) => {
        artifacts[a].color = color(groupIndex[artifacts[a].group], groupKeys.length);
    });
    groupKeys.forEach((g, i) => {
        groups[g].color = color(i, groupKeys.length);
    });

    return {
        groups: Object.values(groups),
        artifacts: Object.values(artifacts),
    };
};

const readDot = (file) => file.text().then(parseDot);

export default readDot;
