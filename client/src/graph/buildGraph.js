import Graph from 'graphology';
import dagre from '@dagrejs/dagre';

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

function seedWithDagre(graph) {
    try {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 }); // TB for seed; interactive hierarchy mode uses LR
        g.setDefaultEdgeLabel(() => ({}));

        graph.forEachNode((id, attrs) => {
            g.setNode(id, { width: attrs.labelWidth || 80, height: LABEL_HEIGHT });
        });
        graph.forEachEdge((_, attrs, src, tgt) => {
            if (attrs.linkType !== 'grouping') g.setEdge(src, tgt);
        });

        dagre.layout(g);

        graph.forEachNode((id) => {
            const pos = g.node(id);
            if (pos) {
                graph.setNodeAttribute(id, 'x', pos.x);
                graph.setNodeAttribute(id, 'y', pos.y);
            }
        });
    } catch (err) {
        console.warn('buildGraph: Dagre seed failed, using zero positions', err);
        // FA2 will still run from (0,0) — not ideal but recoverable
    }
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
            // In a simple directed graph, skip if an edge already exists between these nodes
            if (graph.hasDirectedEdge(link.source, link.target)) continue;
            graph.addEdgeWithKey(edgeId, link.source, link.target, {
                linkType: link.linkType,
            });
        }
    }

    // Seed initial positions from Dagre hierarchy so FA2 starts from a legible state
    seedWithDagre(graph);

    return graph;
}
