import { useEffect, useRef, useState } from 'react';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import dagre from '@dagrejs/dagre';

const FA2_TIMEOUT_MS = 15000;

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

function runDagre(graph, sigma) {
    try {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 200 });
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
        // refresh() triggers re-normalization; wait one frame before resetting camera
        // so sigma's normalization is current before animatedReset maps to it
        sigma.refresh();
        requestAnimationFrame(() => sigma.getCamera().animatedReset({ duration: 200 }));
    } catch (err) {
        console.error('Dagre layout failed:', err);
    }
}

function startFA2(graph, sigma, supervisorRef, timerRef) {
    stopSupervisor(supervisorRef, timerRef);
    if (!graph.order) return;

    const inferred = forceAtlas2.inferSettings(graph);
    const supervisor = new FA2Layout(graph, {
        settings: {
            ...inferred,
            barnesHutOptimize: graph.order > 200,
            gravity: 1,
            scalingRatio: 10,
            slowDown: Math.max(1, Math.log(graph.order)),
        },
    });
    supervisorRef.current = supervisor;
    supervisor.start();

    timerRef.current = setTimeout(() => {
        if (supervisorRef.current === supervisor) {
            supervisor.kill();
            supervisorRef.current = null;
            timerRef.current = null;
            sigma.refresh();
            requestAnimationFrame(() => sigma.getCamera().animatedReset({ duration: 400 }));
        }
    }, FA2_TIMEOUT_MS);
}

export function useLayout(sigma, graph, graphVersion) {
    const supervisorRef = useRef(null);
    const timerRef      = useRef(null);
    const [layoutMode, setLayoutMode] = useState('force');
    const layoutModeRef = useRef(layoutMode);
    useEffect(() => { layoutModeRef.current = layoutMode; }, [layoutMode]);

    const runLayout = useRef(() => {
        if (!sigma || !graph || !graph.order) return;
        if (layoutModeRef.current === 'hierarchy') {
            stopSupervisor(supervisorRef, timerRef);
            runDagre(graph, sigma);
        } else {
            startFA2(graph, sigma, supervisorRef, timerRef);
        }
    });

    // Run layout whenever graph or mode changes
    useEffect(() => {
        if (!sigma || !graph || !graph.order) return;

        if (layoutMode === 'hierarchy') {
            stopSupervisor(supervisorRef, timerRef);
            runDagre(graph, sigma);
        } else {
            startFA2(graph, sigma, supervisorRef, timerRef);
        }

        return () => stopSupervisor(supervisorRef, timerRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sigma, graph, graphVersion, layoutMode]);

    // Keep runLayout ref pointing to fresh graph/sigma
    useEffect(() => {
        runLayout.current = () => {
            if (!sigma || !graph || !graph.order) return;
            if (layoutModeRef.current === 'hierarchy') {
                stopSupervisor(supervisorRef, timerRef);
                runDagre(graph, sigma);
            } else {
                startFA2(graph, sigma, supervisorRef, timerRef);
            }
        };
    }, [sigma, graph]);

    return { layoutMode, setLayoutMode, runLayout };
}
