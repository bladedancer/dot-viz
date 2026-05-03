import { useEffect, useRef, useState } from 'react';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import dagre from '@dagrejs/dagre';

function stopSupervisor(supervisorRef, timerRef) {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
    if (supervisorRef.current) {
        supervisorRef.current.kill();
        supervisorRef.current = null;
    }
}

function runDagre(graph, sigma, dagreSettings) {
    try {
        const g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: dagreSettings.rankdir,
            nodesep: dagreSettings.nodesep,
            ranksep: dagreSettings.ranksep,
            ranker:  dagreSettings.ranker,
        });
        g.setDefaultEdgeLabel(() => ({}));

        graph.forEachNode((id, attrs) => {
            g.setNode(id, { width: attrs.labelWidth || 80, height: attrs.labelHeight || 24 });
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
        sigma.refresh();
        requestAnimationFrame(() => sigma.getCamera().animatedReset({ duration: 200 }));
    } catch (err) {
        console.error('Dagre layout failed:', err);
    }
}

function separateGroups(graph, strength) {
    if (!strength) return;

    // Build per-group centroid and member list
    const groups = new Map();
    graph.forEachNode((id, attrs) => {
        const g = attrs.group || '__none__';
        if (!groups.has(g)) groups.set(g, { nodes: [], cx: 0, cy: 0 });
        groups.get(g).nodes.push(id);
    });
    if (groups.size < 2) return;

    const groupKeys = [...groups.keys()];
    const ITERS = 30;

    for (let iter = 0; iter < ITERS; iter++) {
        // Recompute centroids
        for (const [, grp] of groups) {
            let sx = 0, sy = 0;
            for (const id of grp.nodes) {
                sx += graph.getNodeAttribute(id, 'x');
                sy += graph.getNodeAttribute(id, 'y');
            }
            grp.cx = sx / grp.nodes.length;
            grp.cy = sy / grp.nodes.length;
        }

        // Pairwise repulsion between group centroids
        const delta = new Map(groupKeys.map((k) => [k, { dx: 0, dy: 0 }]));
        for (let i = 0; i < groupKeys.length; i++) {
            for (let j = i + 1; j < groupKeys.length; j++) {
                const a = groups.get(groupKeys[i]);
                const b = groups.get(groupKeys[j]);
                const dx = b.cx - a.cx;
                const dy = b.cy - a.cy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = strength / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                delta.get(groupKeys[i]).dx -= fx;
                delta.get(groupKeys[i]).dy -= fy;
                delta.get(groupKeys[j]).dx += fx;
                delta.get(groupKeys[j]).dy += fy;
            }
        }

        // Apply displacement to all nodes in each group
        for (const [key, d] of delta) {
            for (const id of groups.get(key).nodes) {
                graph.setNodeAttribute(id, 'x', graph.getNodeAttribute(id, 'x') + d.dx);
                graph.setNodeAttribute(id, 'y', graph.getNodeAttribute(id, 'y') + d.dy);
            }
        }
    }
}

function runNoverlap(graph, sigma, forceSettings) {
    // Use half-diagonal of the node's bounding box as collision radius
    graph.forEachNode((id, attrs) => {
        const w = attrs.labelWidth  || 80;
        const h = attrs.labelHeight || 24;
        graph.setNodeAttribute(id, 'size', Math.ceil(Math.sqrt(w * w + h * h) / 2));
    });
    noverlap(graph, { maxIterations: 200, settings: { margin: forceSettings.noverlapMargin ?? 4 } });
    graph.forEachNode((id) => graph.setNodeAttribute(id, 'size', 4));
    separateGroups(graph, forceSettings.groupRepulsion ?? 100);
    sigma.refresh();
}

function startFA2(graph, sigma, supervisorRef, timerRef, forceSettings) {
    stopSupervisor(supervisorRef, timerRef);
    if (!graph.order) return;

    const inferred = forceAtlas2.inferSettings(graph);
    const supervisor = new FA2Layout(graph, {
        settings: {
            ...inferred,
            barnesHutOptimize: graph.order > 200,
            gravity:           forceSettings.gravity,
            scalingRatio:      forceSettings.scalingRatio,
            slowDown:          forceSettings.slowDown ?? Math.max(1, Math.log(graph.order)),
            linLogMode:        forceSettings.linLogMode,
            strongGravityMode: forceSettings.strongGravity,
        },
    });
    supervisorRef.current = supervisor;
    supervisor.start();

    timerRef.current = setTimeout(() => {
        if (supervisorRef.current === supervisor) {
            supervisor.kill();
            supervisorRef.current = null;
            timerRef.current = null;
            runNoverlap(graph, sigma, forceSettings);
            requestAnimationFrame(() => sigma.getCamera().animatedReset({ duration: 400 }));
        }
    }, forceSettings.timeoutMs);
}

export function useLayout(sigma, graph, graphVersion, layoutSettings) {
    const supervisorRef = useRef(null);
    const timerRef      = useRef(null);
    const [layoutMode, setLayoutMode] = useState('force');
    const layoutModeRef = useRef(layoutMode);
    useEffect(() => { layoutModeRef.current = layoutMode; }, [layoutMode]);

    const layoutSettingsRef = useRef(layoutSettings);
    useEffect(() => { layoutSettingsRef.current = layoutSettings; }, [layoutSettings]);

    const runLayout = useRef(() => {
        if (!sigma || !graph || !graph.order) return;
        const s = layoutSettingsRef.current;
        if (layoutModeRef.current === 'hierarchy') {
            stopSupervisor(supervisorRef, timerRef);
            runDagre(graph, sigma, s.dagre);
        } else {
            startFA2(graph, sigma, supervisorRef, timerRef, s.force);
        }
    });

    useEffect(() => {
        if (!sigma || !graph || !graph.order) return;

        if (layoutMode === 'hierarchy') {
            stopSupervisor(supervisorRef, timerRef);
            runDagre(graph, sigma, layoutSettings.dagre);
        } else {
            startFA2(graph, sigma, supervisorRef, timerRef, layoutSettings.force);
        }

        return () => stopSupervisor(supervisorRef, timerRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sigma, graph, graphVersion, layoutMode, layoutSettings]);

    useEffect(() => {
        runLayout.current = () => {
            if (!sigma || !graph || !graph.order) return;
            const s = layoutSettingsRef.current;
            if (layoutModeRef.current === 'hierarchy') {
                stopSupervisor(supervisorRef, timerRef);
                runDagre(graph, sigma, s.dagre);
            } else {
                startFA2(graph, sigma, supervisorRef, timerRef, s.force);
            }
        };
    }, [sigma, graph]);

    return { layoutMode, setLayoutMode, runLayout };
}
