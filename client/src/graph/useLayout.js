import { useEffect, useRef, useState } from 'react';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import forceAtlas2 from 'graphology-layout-forceatlas2';
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
            sigma.refresh();
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
