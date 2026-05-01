# Sigma.js v3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cytoscape.js + cytoscape-cola with Sigma.js v3 + graphology so that layout runs in a Web Worker and the UI stays interactive during computation.

**Architecture:** `GraphLoader` (inside `SigmaContainer`) builds a graphology graph and seeds it with circlepack positions; `GraphEffects` (also inside `SigmaContainer`) installs a single composed nodeReducer and delegates to `useFilter` and `useLayout`. Sigma's WebGL renderer draws custom rounded-rectangle nodes via a hand-written GLSL program.

**Tech Stack:** React 18, Sigma.js v3, graphology, @react-sigma/core v3, graphology-layout-forceatlas2, graphology-layout, graphology-traversal, @dagrejs/dagre

---

## File Map

| Status | File | Change |
|--------|------|--------|
| modify | `package.json` | add sigma/graphology packages, remove cytoscape packages |
| modify | `vite.config.js` | remove `dedupe: ['cytoscape']` |
| modify | `client/src/store.jsx` | remove CyContext / useCy / cy state |
| create | `client/src/graph/buildGraph.js` | nodeData → graphology Graph with circlepack seed |
| create | `client/src/graph/nodeProgram.js` | custom WebGL rounded-rect node program |
| create | `client/src/graph/GraphEffects.jsx` | composed nodeReducer + filter + layout + events |
| modify | `client/src/graph/useFilter.js` | rewrite for graphology-traversal / ref-based |
| modify | `client/src/graph/useLayout.js` | rewrite for FA2 worker + dagre bridge |
| modify | `client/src/graph/Viewer.jsx` | rewrite: SigmaContainer + GraphLoader + GraphEffects |
| modify | `client/src/panels/Toolbar.jsx` | force/hierarchy toggle, camera controls, remove export |
| modify | `client/src/panels/FilterPanel.jsx` | remove source toggle (moved to Toolbar) |
| modify | `client/src/App.jsx` | remove onCyInit / useCy wiring |
| delete | `client/src/graph/buildElements.js` | replaced by buildGraph.js |
| delete | `client/src/graph/stylesheet.js` | replaced by nodeProgram.js |

---

## Task 1: Install packages and strip Cytoscape

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`

- [ ] **Step 1: Install new packages**

```bash
npm install sigma@3 graphology@0.25 @react-sigma/core@3 graphology-layout-forceatlas2@0.10 graphology-layout@0.6 graphology-traversal@0.3 @dagrejs/dagre@1
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Remove old packages**

```bash
npm uninstall cytoscape cytoscape-cola react-cytoscapejs
```

Expected: packages removed from `package.json` and `node_modules`.

- [ ] **Step 3: Remove cytoscape dedupe from vite.config.js**

Open `vite.config.js`. Remove the `resolve` block so it reads:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    root: 'client',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/api': 'http://localhost:8080',
        },
    },
});
```

- [ ] **Step 4: Verify build still starts (will fail to compile — that's fine)**

```bash
npm run dev:client 2>&1 | head -30
```

Expected: vite starts but reports import errors for cytoscape references. That's expected — we haven't updated the source files yet.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js
git commit -m "chore: swap cytoscape for sigma/graphology packages"
```

---

## Task 2: Strip store.jsx of Cytoscape context

**Files:**
- Modify: `client/src/store.jsx`

- [ ] **Step 1: Rewrite store.jsx**

Replace the entire file with:

```jsx
import { createContext, useContext, useReducer, useMemo } from 'react';

const initialState = {
    graph: { groups: [], artifacts: [] },
    graphVersion: 0,
    source: 'artifacts',
    loading: false,
    nodeFilter: { text: '', connected: false, direction: 'both' },
    edgeFilter: { compile: true, provided: true, test: false, grouping: true },
    selection: [],
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_GRAPH':
            return { ...state, graph: action.graph, graphVersion: state.graphVersion + 1 };
        case 'SET_SOURCE':
            return { ...state, source: action.source };
        case 'SET_LOADING':
            return { ...state, loading: action.loading };
        case 'SET_NODE_FILTER':
            return { ...state, nodeFilter: { ...state.nodeFilter, ...action.nodeFilter } };
        case 'SET_EDGE_FILTER':
            return { ...state, edgeFilter: { ...state.edgeFilter, ...action.edgeFilter } };
        case 'SET_SELECTION':
            return { ...state, selection: action.selection };
        default:
            return state;
    }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = useMemo(() => ({ state, dispatch }), [state]);
    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/store.jsx
git commit -m "refactor: remove CyContext/useCy from store"
```

---

## Task 3: Create buildGraph.js

**Files:**
- Create: `client/src/graph/buildGraph.js`

This converts the `nodeData` array (from `parseDot.js`) into a graphology `DirectedGraph` with circlepack seed positions applied.

- [ ] **Step 1: Create the file**

```js
// client/src/graph/buildGraph.js
import Graph from 'graphology';
import circlepack from 'graphology-layout/circlepack';

const LABEL_FONT = '12px monospace'; // must match Sigma's labelFont setting
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

export { LABEL_FONT };
```

- [ ] **Step 2: Verify the file is syntactically valid**

```bash
node --input-type=module < client/src/graph/buildGraph.js 2>&1 | head -5
```

Expected: no output (no syntax errors). Import errors for graphology are fine at this stage — node won't resolve ESM packages without a full build.

- [ ] **Step 3: Commit**

```bash
git add client/src/graph/buildGraph.js
git commit -m "feat: add buildGraph.js — nodeData to graphology graph with circlepack seed"
```

---

## Task 4: Create custom WebGL node program

**Files:**
- Create: `client/src/graph/nodeProgram.js`

This is a Sigma v3 custom node program that renders rounded rectangles sized to each node's `labelWidth` × `labelHeight`. Root nodes get a white border ring; highlighted (selected) nodes get a brighter fill.

- [ ] **Step 1: Create the file**

```js
// client/src/graph/nodeProgram.js
import { AbstractNodeProgram } from 'sigma/rendering';

const VERTEX_SHADER_SOURCE = /* glsl */`
attribute vec2  a_position;
attribute float a_size;
attribute vec4  a_color;
attribute float a_nodeW;
attribute float a_nodeH;
attribute float a_isRoot;
attribute float a_highlighted;
attribute vec4  a_id;

uniform mat3  u_matrix;
uniform float u_sizeRatio;
uniform float u_pixelRatio;
uniform vec2  u_dimensions;

varying vec4  v_color;
varying float v_border;
varying vec2  v_diffVector;
varying float v_radius;
varying float v_innerRadius;
varying float v_highlighted;
varying vec4  v_id;

void main() {
    vec2 marginedPos = (u_matrix * vec3(a_position, 1.0)).xy;
    float w = a_nodeW * u_pixelRatio / u_sizeRatio * 0.5;
    float h = a_nodeH * u_pixelRatio / u_sizeRatio * 0.5;

    // Pass to fragment for SDF
    v_diffVector = vec2(w, h);
    v_radius     = min(w, h);
    v_innerRadius = v_radius - 2.5 * u_pixelRatio;
    v_border     = a_isRoot;
    v_highlighted = a_highlighted;
    v_color      = a_color;
    v_id         = a_id;

    gl_Position  = vec4(marginedPos, 0.0, 1.0);
    gl_PointSize = max(w, h) * 2.0;
}
`;

const FRAGMENT_SHADER_SOURCE = /* glsl */`
precision mediump float;

varying vec4  v_color;
varying float v_border;
varying vec2  v_diffVector;
varying float v_radius;
varying float v_innerRadius;
varying float v_highlighted;
varying vec4  v_id;

uniform bool u_picking;

// Rounded-rect SDF: returns distance from point p to rounded rectangle of half-extents b with radius r
float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
    vec2 uv  = gl_PointCoord * 2.0 - 1.0;  // -1..1
    vec2 pos = uv * v_diffVector;

    float cornerR = min(v_radius * 0.35, 6.0);
    float d = roundedBoxSDF(pos, v_diffVector - cornerR, cornerR);

    if (u_picking) {
        if (d > 0.0) discard;
        gl_FragColor = v_id;
        return;
    }

    // Anti-aliased fill
    float alpha = 1.0 - smoothstep(-1.0, 1.0, d);
    if (alpha < 0.01) discard;

    vec3 col = v_color.rgb;
    if (v_highlighted > 0.5) col = min(col * 1.6, vec3(1.0));

    // White border ring for root nodes
    if (v_border > 0.5) {
        float borderD = roundedBoxSDF(pos, v_diffVector - cornerR - 3.5, cornerR);
        float borderAlpha = (1.0 - smoothstep(-1.0, 1.0, borderD)) - alpha;
        if (borderAlpha > 0.05) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, borderAlpha);
            return;
        }
    }

    gl_FragColor = vec4(col, v_color.a * alpha);
}
`;

const UNIFORMS = ['u_sizeRatio', 'u_pixelRatio', 'u_matrix', 'u_dimensions', 'u_picking'];

export default class RoundedRectProgram extends AbstractNodeProgram {
    constructor(gl, pickingBuffer, renderer) {
        super(gl, pickingBuffer, renderer, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE, 1, UNIFORMS);
        this.bind();
    }

    getDefinition() {
        return {
            VERTICES: 1,
            VERTEX_SHADER_SOURCE,
            FRAGMENT_SHADER_SOURCE,
            METHOD: WebGLRenderingContext.POINTS,
            UNIFORMS,
            ATTRIBUTES: [
                { name: 'a_position',    size: 2, type: WebGLRenderingContext.FLOAT },
                { name: 'a_size',        size: 1, type: WebGLRenderingContext.FLOAT },
                { name: 'a_color',       size: 4, type: WebGLRenderingContext.UNSIGNED_BYTE, normalized: true },
                { name: 'a_nodeW',       size: 1, type: WebGLRenderingContext.FLOAT },
                { name: 'a_nodeH',       size: 1, type: WebGLRenderingContext.FLOAT },
                { name: 'a_isRoot',      size: 1, type: WebGLRenderingContext.FLOAT },
                { name: 'a_highlighted', size: 1, type: WebGLRenderingContext.FLOAT },
                { name: 'a_id',          size: 4, type: WebGLRenderingContext.UNSIGNED_BYTE, normalized: true },
            ],
        };
    }

    processVisibleItem(nodeIndex, startIndex, data) {
        const array = this.array;
        const i = startIndex;
        const color = this.normalizeColor(data.color || '#888888');
        array[i]     = data.x;
        array[i + 1] = data.y;
        array[i + 2] = data.size || 4;
        array[i + 3] = color[0];
        array[i + 4] = color[1];
        array[i + 5] = color[2];
        array[i + 6] = color[3];
        array[i + 7] = data.labelWidth  || 80;
        array[i + 8] = data.labelHeight || 24;
        array[i + 9] = data.root ? 1.0 : 0.0;
        array[i + 10] = data.highlighted ? 1.0 : 0.0;
    }

    setUniforms(params, { gl, uniformLocations }) {
        const { u_sizeRatio, u_pixelRatio, u_matrix, u_dimensions, u_picking } = uniformLocations;
        gl.uniform1f(u_sizeRatio,  params.sizeRatio);
        gl.uniform1f(u_pixelRatio, params.pixelRatio);
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
        gl.uniform2f(u_dimensions, params.width, params.height);
        gl.uniform1i(u_picking, params.picking ? 1 : 0);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/graph/nodeProgram.js
git commit -m "feat: add custom WebGL rounded-rect node program"
```

---

## Task 5: Rewrite useFilter.js

**Files:**
- Modify: `client/src/graph/useFilter.js`

- [ ] **Step 1: Rewrite the file**

```js
// client/src/graph/useFilter.js
import { useEffect } from 'react';
import { bfsFromNode } from 'graphology-traversal';

export function useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef) {
    useEffect(() => {
        if (!graph || !graph.order) {
            visibleIdsRef.current = new Set();
            return;
        }

        const filterText = nodeFilter.text ? nodeFilter.text.toLowerCase() : '';
        const useConnected = filterText && nodeFilter.connected;

        if (!filterText) {
            // No text filter — all nodes visible
            visibleIdsRef.current = new Set(graph.nodes());
            sigma.refresh();
            return;
        }

        // Step 1: find text-matching seed nodes
        const seeds = [];
        graph.forEachNode((id, attrs) => {
            if (attrs.label && attrs.label.toLowerCase().includes(filterText)) {
                seeds.push(id);
            }
        });

        if (!useConnected) {
            visibleIdsRef.current = new Set(seeds);
            sigma.refresh();
            return;
        }

        // Step 2: BFS from each seed, respecting direction and edge filter
        const visible = new Set(seeds);
        const direction = nodeFilter.direction; // 'inbound' | 'outbound' | 'both'

        for (const seed of seeds) {
            if (!graph.hasNode(seed)) continue;
            bfsFromNode(graph, seed, (node) => { visible.add(node); }, {
                mode: direction === 'inbound'  ? 'inbound'
                    : direction === 'outbound' ? 'outbound'
                    : 'mixed',
                edgeFilter: (_, edgeAttrs) => !!edgeFilter[edgeAttrs.linkType],
            });
        }

        visibleIdsRef.current = visible;
        sigma.refresh();
    }, [sigma, graph, nodeFilter, edgeFilter, graphVersion]);
    // visibleIdsRef is a ref — intentionally not in deps
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/graph/useFilter.js
git commit -m "feat: rewrite useFilter for graphology-traversal"
```

---

## Task 6: Rewrite useLayout.js

**Files:**
- Modify: `client/src/graph/useLayout.js`

- [ ] **Step 1: Rewrite the file**

```js
// client/src/graph/useLayout.js
import { useEffect, useRef, useState } from 'react';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import dagre from '@dagrejs/dagre';

const FA2_TIMEOUT_MS = 5000;

function stopWorker(workerRef, timerRef) {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
    if (workerRef.current) {
        workerRef.current.kill();
        workerRef.current = null;
    }
}

function runDagre(graph, sigma) {
    try {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 });
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
    } catch (err) {
        console.error('Dagre layout failed:', err);
    }
}

export function useLayout(sigma, graph, graphVersion) {
    const workerRef = useRef(null);
    const timerRef  = useRef(null);
    const [layoutMode, setLayoutMode] = useState('force'); // 'force' | 'hierarchy'
    const layoutModeRef = useRef(layoutMode);
    useEffect(() => { layoutModeRef.current = layoutMode; }, [layoutMode]);

    const runLayout = useRef(null);

    useEffect(() => {
        if (!sigma || !graph || !graph.order) return;

        stopWorker(workerRef, timerRef);

        if (layoutModeRef.current === 'hierarchy') {
            runDagre(graph, sigma);
            return;
        }

        // FA2 worker mode
        const settings = forceAtlas2.inferSettings(graph);
        const worker = new FA2Layout(graph, {
            settings: { ...settings, barnesHutOptimize: true },
        });
        workerRef.current = worker;

        const clearTimer = () => {
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        };

        worker.on('killed',      clearTimer);
        worker.on('stop',        clearTimer);
        worker.on('layoutError', (err) => {
            console.error('FA2 layout error:', err);
            clearTimer();
        });

        timerRef.current = setTimeout(() => {
            if (workerRef.current === worker) worker.kill();
        }, FA2_TIMEOUT_MS);

        worker.start();

        return () => stopWorker(workerRef, timerRef);
    }, [sigma, graph, graphVersion, layoutMode]);

    // Assign runLayout function so Toolbar can call it
    runLayout.current = () => {
        if (!sigma || !graph || !graph.order) return;
        stopWorker(workerRef, timerRef);
        if (layoutModeRef.current === 'hierarchy') {
            runDagre(graph, sigma);
            return;
        }
        const settings = forceAtlas2.inferSettings(graph);
        const worker = new FA2Layout(graph, {
            settings: { ...settings, barnesHutOptimize: true },
        });
        workerRef.current = worker;
        timerRef.current = setTimeout(() => {
            if (workerRef.current === worker) worker.kill();
        }, FA2_TIMEOUT_MS);
        worker.on('killed', () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } });
        worker.start();
    };

    return { layoutMode, setLayoutMode, runLayout };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/graph/useLayout.js
git commit -m "feat: rewrite useLayout for FA2 worker + dagre bridge"
```

---

## Task 7: Create GraphEffects.jsx

**Files:**
- Create: `client/src/graph/GraphEffects.jsx`

- [ ] **Step 1: Create the file**

```jsx
// client/src/graph/GraphEffects.jsx
import { useEffect, useRef } from 'react';
import { useSigma, useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import { useStore } from '../store.jsx';
import { useFilter } from './useFilter.js';
import { useLayout } from './useLayout.js';
import { buildGraph } from './buildGraph.js';

// GraphLoader: loads/reloads the graphology graph whenever nodeData changes
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

    const hoveredNodeRef = useRef(null);
    const visibleIdsRef  = useRef(new Set());
    const edgeFilterRef  = useRef(edgeFilter);
    useEffect(() => { edgeFilterRef.current = edgeFilter; }, [edgeFilter]);

    // Install composed reducers once on mount — they read from refs, never stale
    useEffect(() => {
        sigma.setSetting('nodeReducer', (nodeId, data) => {
            if (visibleIdsRef.current.size > 0 && !visibleIdsRef.current.has(nodeId)) {
                return { ...data, hidden: true };
            }
            if (nodeId === hoveredNodeRef.current) return { ...data, highlighted: true };
            return data;
        });
        sigma.setSetting('edgeReducer', (edgeId, data) => {
            const lt = graph.getEdgeAttribute(edgeId, 'linkType');
            return edgeFilterRef.current[lt] ? data : { ...data, hidden: true };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef);

    const { layoutMode, setLayoutMode, runLayout } = useLayout(sigma, graph, graphVersion);

    useRegisterEvents({
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

    // Expose layout controls via a DOM custom event so Toolbar can reach them
    // (Toolbar is outside SigmaContainer and can't call useSigma)
    useEffect(() => {
        const handleRerun = () => runLayout.current?.();
        const handleToggle = (e) => setLayoutMode(e.detail);
        window.addEventListener('sigma:rerun-layout', handleRerun);
        window.addEventListener('sigma:set-layout-mode', handleToggle);
        return () => {
            window.removeEventListener('sigma:rerun-layout', handleRerun);
            window.removeEventListener('sigma:set-layout-mode', handleToggle);
        };
    }, [setLayoutMode]);

    // Expose camera controls the same way
    useEffect(() => {
        const handleFitAll = () => sigma.getCamera().animatedReset({ duration: 200 });
        const handleFitSelection = (e) => {
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
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const span = Math.max(maxX - minX, maxY - minY, 1);
            const ratio = span / Math.min(sigma.getContainer().offsetWidth, sigma.getContainer().offsetHeight) * 1.3;
            sigma.getCamera().animate({ x: cx, y: cy, ratio }, { duration: 200 });
        };
        window.addEventListener('sigma:fit-all', handleFitAll);
        window.addEventListener('sigma:fit-selection', handleFitSelection);
        return () => {
            window.removeEventListener('sigma:fit-all', handleFitAll);
            window.removeEventListener('sigma:fit-selection', handleFitSelection);
        };
    }, [sigma, graph]);

    // Expose current layoutMode for Toolbar to read
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('sigma:layout-mode-changed', { detail: layoutMode }));
    }, [layoutMode]);

    return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/graph/GraphEffects.jsx
git commit -m "feat: add GraphEffects — composed reducer, filter, layout, events"
```

---

## Task 8: Rewrite Viewer.jsx

**Files:**
- Modify: `client/src/graph/Viewer.jsx`
- Delete: `client/src/graph/buildElements.js`
- Delete: `client/src/graph/stylesheet.js`

- [ ] **Step 1: Rewrite Viewer.jsx**

```jsx
// client/src/graph/Viewer.jsx
import React from 'react';
import { SigmaContainer } from '@react-sigma/core';
import RoundedRectProgram from './nodeProgram.js';
import { LABEL_FONT } from './buildGraph.js';
import { GraphLoader, GraphEffects } from './GraphEffects.jsx';

const sigmaSettings = {
    nodeProgramClasses: { rounded: RoundedRectProgram },
    defaultNodeType: 'rounded',
    labelFont: LABEL_FONT,
    labelColor: { color: '#c9d1d9' },
    labelSize: 12,
    labelWeight: '400',
    minCameraRatio: 0.05,
    maxCameraRatio: 10,
    renderEdgeLabels: false,
    defaultEdgeColor: '#555',
    defaultEdgeType: 'arrow',
};

export default function Viewer({ nodeData, loading }) {
    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <SigmaContainer settings={sigmaSettings} style={{ width: '100%', height: '100%' }}>
                <GraphLoader nodeData={nodeData} />
                <GraphEffects />
            </SigmaContainer>
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Delete the replaced files**

```bash
rm client/src/graph/buildElements.js client/src/graph/stylesheet.js
```

- [ ] **Step 3: Commit**

```bash
git add -A client/src/graph/
git commit -m "feat: rewrite Viewer.jsx with SigmaContainer; delete buildElements + stylesheet"
```

---

## Task 9: Rewrite Toolbar.jsx

**Files:**
- Modify: `client/src/panels/Toolbar.jsx`

The Toolbar is outside `SigmaContainer`, so it communicates with `GraphEffects` via `CustomEvent` on `window`.

- [ ] **Step 1: Rewrite Toolbar.jsx**

```jsx
// client/src/panels/Toolbar.jsx
import React, { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';

const Toolbar = () => {
    const { state, dispatch } = useStore();
    const [layoutMode, setLayoutMode] = useState('force');

    // Sync layoutMode from GraphEffects
    useEffect(() => {
        const handler = (e) => setLayoutMode(e.detail);
        window.addEventListener('sigma:layout-mode-changed', handler);
        return () => window.removeEventListener('sigma:layout-mode-changed', handler);
    }, []);

    const rerun   = () => window.dispatchEvent(new Event('sigma:rerun-layout'));
    const fitAll  = () => window.dispatchEvent(new Event('sigma:fit-all'));
    const fitSel  = () => window.dispatchEvent(new CustomEvent('sigma:fit-selection', { detail: state.selection }));

    const setMode = (mode) => {
        window.dispatchEvent(new CustomEvent('sigma:set-layout-mode', { detail: mode }));
        setLayoutMode(mode);
        rerun();
    };

    const zoomIn  = () => window.dispatchEvent(new CustomEvent('sigma:zoom', { detail: 1.3 }));
    const zoomOut = () => window.dispatchEvent(new CustomEvent('sigma:zoom', { detail: 1 / 1.3 }));

    const setSource = (s) => dispatch({ type: 'SET_SOURCE', source: s });

    const hasSelection = state.selection.length > 0;

    return (
        <div className="toolbar">
            {/* Zoom */}
            <button className="tool-btn" title="Zoom in"  onClick={zoomIn}>+</button>
            <button className="tool-btn" title="Zoom out" onClick={zoomOut}>−</button>
            <button className="tool-btn" title="Fit graph"      onClick={fitAll}>⊡</button>
            <button className="tool-btn" title="Fit selection"  onClick={fitSel} disabled={!hasSelection}>⊙</button>
            <div className="toolbar-sep" />

            {/* Layout */}
            <button
                className={`tool-btn${layoutMode === 'force' ? ' active' : ''}`}
                title="Force layout (FA2)"
                onClick={() => setMode('force')}
            >⊛</button>
            <button
                className={`tool-btn${layoutMode === 'hierarchy' ? ' active' : ''}`}
                title="Hierarchy layout (Dagre)"
                onClick={() => setMode('hierarchy')}
            >⊞</button>
            <button className="tool-btn" title="Re-run layout" onClick={rerun}>⟳</button>
            <div className="toolbar-sep" />

            {/* Source */}
            <button
                className={`tool-btn${state.source === 'artifacts' ? ' active' : ''}`}
                title="Show artifacts"
                onClick={() => setSource('artifacts')}
            >A</button>
            <button
                className={`tool-btn${state.source === 'groups' ? ' active' : ''}`}
                title="Show groups"
                onClick={() => setSource('groups')}
            >G</button>
        </div>
    );
};

export default Toolbar;
```

- [ ] **Step 2: Add `active` style to toolbar buttons in theme.css**

Open `client/src/theme.css`. After the `.tool-btn:disabled` rule, add:

```css
.tool-btn.active { background: var(--accent-bg); color: #fff; }
```

- [ ] **Step 3: Wire up zoom events inside GraphEffects**

The zoom CustomEvent dispatched by Toolbar needs a listener in `GraphEffects`. Add to the camera `useEffect` block in `client/src/graph/GraphEffects.jsx` (the second one that registers `sigma:fit-all`):

```jsx
const handleZoom = (e) => {
    const factor = e.detail;
    const camera = sigma.getCamera();
    if (factor > 1) camera.animatedZoom({ duration: 150 });
    else camera.animatedUnzoom({ duration: 150 });
};
window.addEventListener('sigma:zoom', handleZoom);
// ... add to return cleanup:
window.removeEventListener('sigma:zoom', handleZoom);
```

Specifically, replace the entire second `useEffect` in GraphEffects.jsx with:

```jsx
useEffect(() => {
    const handleFitAll = () => sigma.getCamera().animatedReset({ duration: 200 });
    const handleFitSelection = (e) => {
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
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const span = Math.max(maxX - minX, maxY - minY, 1);
        const ratio = span / Math.min(sigma.getContainer().offsetWidth, sigma.getContainer().offsetHeight) * 1.3;
        sigma.getCamera().animate({ x: cx, y: cy, ratio }, { duration: 200 });
    };
    const handleZoom = (e) => {
        if (e.detail > 1) sigma.getCamera().animatedZoom({ duration: 150 });
        else sigma.getCamera().animatedUnzoom({ duration: 150 });
    };
    window.addEventListener('sigma:fit-all', handleFitAll);
    window.addEventListener('sigma:fit-selection', handleFitSelection);
    window.addEventListener('sigma:zoom', handleZoom);
    return () => {
        window.removeEventListener('sigma:fit-all', handleFitAll);
        window.removeEventListener('sigma:fit-selection', handleFitSelection);
        window.removeEventListener('sigma:zoom', handleZoom);
    };
}, [sigma, graph]);
```

- [ ] **Step 4: Commit**

```bash
git add client/src/panels/Toolbar.jsx client/src/theme.css client/src/graph/GraphEffects.jsx
git commit -m "feat: rewrite Toolbar with layout toggle, camera controls, source toggle"
```

---

## Task 10: Update FilterPanel.jsx — remove source toggle

**Files:**
- Modify: `client/src/panels/FilterPanel.jsx`

The source toggle (Artifacts / Groups) moves to Toolbar. Remove it from FilterPanel.

- [ ] **Step 1: Rewrite FilterPanel.jsx**

```jsx
// client/src/panels/FilterPanel.jsx
import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useStore } from '../store.jsx';

const EDGE_TYPES = [
    { key: 'compile',  label: 'Compile' },
    { key: 'provided', label: 'Provided' },
    { key: 'test',     label: 'Test' },
    { key: 'grouping', label: 'Grouping' },
];

const FilterPanel = () => {
    const { state, dispatch } = useStore();
    const { nodeFilter, edgeFilter } = state;

    const setNodeFilter = (nf) => dispatch({ type: 'SET_NODE_FILTER', nodeFilter: nf });
    const setEdgeFilter = (ef) => dispatch({ type: 'SET_EDGE_FILTER', edgeFilter: ef });

    const debouncedText = useDebouncedCallback(
        (text) => setNodeFilter({ text, connected: false }),
        200
    );

    return (
        <div className="panel filter-panel">
            <input
                className="path-input"
                type="text"
                placeholder="Filter nodes…"
                defaultValue={nodeFilter.text}
                onChange={(e) => debouncedText(e.target.value)}
            />

            <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={nodeFilter.connected}
                    onChange={(e) => setNodeFilter({ connected: e.target.checked })}
                />
                Connected nodes
            </label>

            {nodeFilter.connected && (
                <div className="seg-control">
                    {['both', 'inbound', 'outbound'].map((d) => (
                        <button
                            key={d}
                            className={`seg-btn${nodeFilter.direction === d ? ' active' : ''}`}
                            onClick={() => setNodeFilter({ direction: d })}
                        >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            <div className="divider" />
            {EDGE_TYPES.map(({ key, label }) => (
                <label key={key} className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={edgeFilter[key]}
                        onChange={(e) => setEdgeFilter({ [key]: e.target.checked })}
                    />
                    {label}
                </label>
            ))}
        </div>
    );
};

export default FilterPanel;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/panels/FilterPanel.jsx
git commit -m "refactor: remove source toggle from FilterPanel (moved to Toolbar)"
```

---

## Task 11: Update App.jsx

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Rewrite App.jsx**

```jsx
// client/src/App.jsx
import React from 'react';
import { StoreProvider, useStore } from './store.jsx';
import Viewer from './graph/Viewer.jsx';
import PomPanel from './panels/PomPanel.jsx';
import FilterPanel from './panels/FilterPanel.jsx';
import Toolbar from './panels/Toolbar.jsx';
import './theme.css';

function AppInner() {
    const { state } = useStore();
    const { source, graph, loading } = state;
    const nodeData = graph[source] || [];

    return (
        <div className="app">
            <Viewer nodeData={nodeData} loading={loading} />

            <div className="overlay top-left">
                <PomPanel />
                <FilterPanel />
            </div>

            <div className="overlay bottom-right">
                <Toolbar />
            </div>
        </div>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <AppInner />
        </StoreProvider>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/App.jsx
git commit -m "refactor: remove onCyInit/useCy from App"
```

---

## Task 12: Build and smoke-test

- [ ] **Step 1: Run the dev server**

```bash
npm run dev:client
```

Expected: vite compiles with no errors. If there are import errors, fix them before proceeding.

- [ ] **Step 2: Open the app in a browser**

Navigate to `http://localhost:5173` (or the port vite prints). Expected: the app loads with an empty dark canvas.

- [ ] **Step 3: Start the backend**

In a second terminal:

```bash
npm start
```

- [ ] **Step 4: Load a POM file**

Enter a valid `pom.xml` path and click **Load**. Expected:
- Graph nodes render as rounded rectangles
- Labels visible on nodes
- Root nodes have a white border ring
- FA2 layout begins animating (nodes move for ~5 seconds then settle)
- UI remains responsive during layout (click buttons, type in filter — no jank)

- [ ] **Step 5: Test filter**

Type a partial artifact name in the filter box. Expected: non-matching nodes disappear. Clear the box — all nodes reappear.

- [ ] **Step 6: Test layout toggle**

Click the hierarchy (⊞) button. Expected: nodes rearrange into a left-to-right DAG layout. Click force (⊛) — nodes return to clustered layout.

- [ ] **Step 7: Test source toggle**

Click **G** (groups). Expected: graph re-renders with group-level nodes. Click **A** (artifacts) — returns to artifact view.

- [ ] **Step 8: Test camera controls**

Click zoom in (+), zoom out (−), fit (⊡). Expected: camera animates smoothly. Click a node then fit selection (⊙) — camera fits to that node.

- [ ] **Step 9: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: post-integration corrections from smoke test"
```

---

## Task 13: Production build verification

- [ ] **Step 1: Run production build**

```bash
npm run build 2>&1
```

Expected: exits 0, no errors. Warnings about bundle size are acceptable.

- [ ] **Step 2: Commit build confirmation**

```bash
git add -A
git commit -m "chore: verify production build passes post-sigma-migration"
```
