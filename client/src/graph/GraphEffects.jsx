import { useEffect, useRef } from 'react';
import { useSigma, useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import { useStore } from '../store.jsx';
import { useFilter } from './useFilter.js';
import { useLayout } from './useLayout.js';
import { buildGraph } from './buildGraph.js';

// GraphLoader: rebuilds the graphology graph whenever nodeData changes
export function GraphLoader({ nodeData }) {
    const loadGraph = useLoadGraph();

    useEffect(() => {
        if (!nodeData || nodeData.length === 0) return;
        const graph = buildGraph(nodeData);
        loadGraph(graph, true);
    }, [nodeData, loadGraph]);

    return null;
}

// GraphEffects: installs reducers, wires filter/layout/events
// Must be rendered inside <SigmaContainer> to access useSigma()
export function GraphEffects() {
    const sigma = useSigma();
    const graph = sigma.getGraph();
    const { state, dispatch } = useStore();
    const { nodeFilter, edgeFilter, graphVersion } = state;
    const registerEvents = useRegisterEvents();

    const hoveredNodeRef = useRef(null);
    const visibleIdsRef  = useRef(new Set());
    const edgeFilterRef  = useRef(edgeFilter);
    useEffect(() => { edgeFilterRef.current = edgeFilter; }, [edgeFilter]);

    // Install composed reducers once on mount — read from refs, never stale
    useEffect(() => {
        sigma.setSetting('nodeReducer', (nodeId, data) => {
            if (visibleIdsRef.current.size > 0 && !visibleIdsRef.current.has(nodeId)) {
                return { ...data, hidden: true };
            }
            if (nodeId === hoveredNodeRef.current) return { ...data, highlighted: true };
            return data;
        });
        sigma.setSetting('edgeReducer', (edgeId, data) => {
            try {
                const lt = graph.getEdgeAttribute(edgeId, 'linkType');
                return edgeFilterRef.current[lt] ? data : { ...data, hidden: true };
            } catch {
                return data;
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef);

    const { layoutMode, setLayoutMode, runLayout } = useLayout(sigma, graph, graphVersion);

    // Register Sigma events
    useEffect(() => {
        registerEvents({
            enterNode: ({ node }) => {
                hoveredNodeRef.current = node;
                sigma.refresh();
            },
            leaveNode: () => {
                hoveredNodeRef.current = null;
                sigma.refresh();
            },
            clickNode: ({ node }) => {
                dispatch({ type: 'SET_SELECTION', selection: [node] });
            },
            clickStage: () => {
                dispatch({ type: 'SET_SELECTION', selection: [] });
            },
        });
    }, [registerEvents, sigma, dispatch]);

    // Window event bridge — Toolbar is outside SigmaContainer and communicates via CustomEvent
    useEffect(() => {
        const handleRerun   = () => runLayout.current?.();
        const handleToggle  = (e) => setLayoutMode(e.detail);
        const handleFitAll  = () => sigma.getCamera().animatedReset({ duration: 200 });
        const handleFitSel  = (e) => {
            const nodeIds = e.detail;
            if (!nodeIds?.length) return;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const id of nodeIds) {
                if (!graph.hasNode(id)) continue;
                const x = graph.getNodeAttribute(id, 'x');
                const y = graph.getNodeAttribute(id, 'y');
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
            if (!isFinite(minX)) return;
            const cx   = (minX + maxX) / 2;
            const cy   = (minY + maxY) / 2;
            const span = Math.max(maxX - minX, maxY - minY, 1);
            const w    = sigma.getContainer().offsetWidth;
            const h    = sigma.getContainer().offsetHeight;
            const ratio = span / Math.min(w, h) * 1.6;
            sigma.getCamera().animate({ x: cx, y: cy, ratio }, { duration: 200 });
        };
        const handleZoom = (e) => {
            if (e.detail > 1) sigma.getCamera().animatedZoom({ duration: 150 });
            else sigma.getCamera().animatedUnzoom({ duration: 150 });
        };

        window.addEventListener('sigma:rerun-layout',    handleRerun);
        window.addEventListener('sigma:set-layout-mode', handleToggle);
        window.addEventListener('sigma:fit-all',         handleFitAll);
        window.addEventListener('sigma:fit-selection',   handleFitSel);
        window.addEventListener('sigma:zoom',            handleZoom);
        return () => {
            window.removeEventListener('sigma:rerun-layout',    handleRerun);
            window.removeEventListener('sigma:set-layout-mode', handleToggle);
            window.removeEventListener('sigma:fit-all',         handleFitAll);
            window.removeEventListener('sigma:fit-selection',   handleFitSel);
            window.removeEventListener('sigma:zoom',            handleZoom);
        };
    }, [sigma, graph, setLayoutMode]);

    // Broadcast current layoutMode so Toolbar can sync its toggle state
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('sigma:layout-mode-changed', { detail: layoutMode }));
    }, [layoutMode]);

    return null;
}
