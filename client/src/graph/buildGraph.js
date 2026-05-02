import Graph from 'graphology';
import circlepack from 'graphology-layout/circlepack';

export const LABEL_FONT = '12px monospace'; // must match Sigma's labelFont setting
const LABEL_HEIGHT = 24;
const LABEL_PADDING = 16;
const NODE_SIZE = 4; // Sigma requires a numeric size even with custom program

function measureLabel(text) {
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext('2d');
        ctx.font = LABEL_FONT;
        return Math.ceil(ctx.measureText(text).width) + LABEL_PADDING;
    }
    return 120; // fallback for environments without OffscreenCanvas
}

export function buildGraph(nodeData) {
    const graph = new Graph({ type: 'directed', multi: false });
    const nodeById = new Map(nodeData.map((n) => [n.id, n]));
    const edgeIds = new Set();

    for (const n of nodeData) {
        if (!n.id || !n.name) {
            console.warn('buildGraph: skipping malformed node', n);
            continue;
        }
        graph.addNode(n.id, {
            label:       n.name,
            color:       n.color,
            group:       n.group,
            root:        n.isRoot,
            size:        NODE_SIZE,
            x:           0,
            y:           0,
            labelWidth:  measureLabel(n.name),
            labelHeight: LABEL_HEIGHT,
        });
    }

    for (const n of nodeData) {
        if (!n.id) continue;
        for (const link of n.links) {
            if (link.source === link.target) continue;
            if (!nodeById.has(link.target)) continue;
            const edgeId = `${link.linkType}-${link.source}-${link.target}`;
            if (edgeIds.has(edgeId)) continue;
            edgeIds.add(edgeId);
            if (!graph.hasNode(link.source) || !graph.hasNode(link.target)) continue;
            graph.addEdgeWithKey(edgeId, link.source, link.target, {
                linkType: link.linkType,
            });
        }
    }

    // Seed positions so FA2 converges faster than from random
    circlepack.assign(graph, { groupAttribute: 'group', scale: 200 });

    return graph;
}
