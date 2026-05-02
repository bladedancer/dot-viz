import chroma from 'chroma-js';
import * as graphlibDot from '@dagrejs/graphlib-dot';

function spectralColor(index, total) {
    return chroma(chroma.scale('Spectral').colors(total)[index]).darken().hex();
}

export function parseDot(text) {
    // Strip HTML labels — graphlib-dot can't parse <...> values
    const sanitized = text.replace(/label=<[^>\n]*(?:>[^>\n]*)*>(,\s*)?/g, '');
    const graph = graphlibDot.read(sanitized);
    const nodeIds = graph.nodes();
    const edgeDefs = graph.edges();

    if (!nodeIds.length) return { groups: [], artifacts: [] };

    // ── Build artifact map ────────────────────────────────────────────────────
    const artifacts = {};
    nodeIds.forEach((id) => {
        const parts = id.split(':');
        const group = parts[0];
        const name = parts[1] || id;
        const canonicalId = `${group}:${name}`;
        if (!artifacts[canonicalId]) {
            artifacts[canonicalId] = { id: canonicalId, group, name, links: [], color: '#888', isRoot: true };
        }
    });

    // ── Wire edges ────────────────────────────────────────────────────────────
    edgeDefs.forEach((edge) => {
        const fromParts = edge.v.split(':');
        const toParts   = edge.w.split(':');
        const sourceId  = `${fromParts[0]}:${fromParts[1] || edge.v}`;
        const targetId  = `${toParts[0]}:${toParts[1] || edge.w}`;
        if (sourceId === targetId) return;
        if (!artifacts[sourceId] || !artifacts[targetId]) return;

        const attrs    = graph.edge(edge.v, edge.w) || {};
        const linkType = attrs.style || attrs.label || 'compile';
        const exists   = artifacts[sourceId].links.some(
            (l) => l.target === targetId && l.linkType === linkType
        );
        if (!exists) {
            artifacts[sourceId].links.push({ source: sourceId, target: targetId, linkType });
        }
    });

    // ── Mark roots (nodes with no incoming edges) ─────────────────────────────
    const targetIds = new Set(edgeDefs.map((e) => {
        const p = e.w.split(':');
        return `${p[0]}:${p[1] || e.w}`;
    }));
    Object.keys(artifacts).forEach((k) => { artifacts[k].isRoot = !targetIds.has(k); });

    // ── Build group map ───────────────────────────────────────────────────────
    const groups = {};
    Object.values(artifacts).forEach((node) => {
        if (groups[node.group]) {
            node.links.forEach((link) => {
                const exists = groups[node.group].links.some(
                    (l) => l.source === link.source && l.target === link.target && l.linkType === link.linkType
                );
                if (!exists) groups[node.group].links.push(link);
            });
        } else {
            groups[node.group] = { id: node.group, group: node.group, name: node.group, links: [...node.links], color: '#888' };
        }
    });

    // ── Grouping edges: chain within each group (A→B→C) ──────────────────────
    const groupKeys = Object.keys(groups);
    groupKeys.forEach((g) => {
        const members = Object.values(artifacts).filter((a) => a.group === g);
        for (let i = 0; i < members.length - 1; i++) {
            const sourceId = `${members[i].group}:${members[i].name}`;
            const targetId = `${members[i + 1].group}:${members[i + 1].name}`;
            if (sourceId !== targetId) {
                members[i].links.push({ source: sourceId, target: targetId, linkType: 'grouping' });
            }
        }
    });

    // ── Assign colors ─────────────────────────────────────────────────────────
    const groupIndex = Object.fromEntries(groupKeys.map((g, i) => [g, i]));
    Object.values(artifacts).forEach((a) => { a.color = spectralColor(groupIndex[a.group], groupKeys.length); });
    groupKeys.forEach((g, i) => { groups[g].color = spectralColor(i, groupKeys.length); });

    return { groups: Object.values(groups), artifacts: Object.values(artifacts) };
}
