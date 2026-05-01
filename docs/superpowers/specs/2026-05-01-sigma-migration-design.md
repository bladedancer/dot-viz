# Sigma.js v3 Migration Design

**Date:** 2026-05-01  
**Status:** Approved  
**Scope:** Replace Cytoscape.js + cytoscape-cola with Sigma.js v3 + graphology for rendering Maven dependency graphs

---

## Context

The current stack (Cytoscape.js + cytoscape-cola) degrades at 500–1000 nodes. Cola runs on the main thread with an rAF loop that must be force-killed via a `setTimeout` hack. The migration to Sigma.js v3 + graphology delivers:

- **Non-blocking layout** via ForceAtlas2 running in a Web Worker
- **WebGL rendering** for future-proofing at graph sizes beyond 1000 nodes
- **Smarter label culling** to avoid text collisions at high zoom

Performance at 500–1000 nodes will be comparable to Cytoscape; the main user-visible improvement is that the UI remains fully interactive during layout computation.

---

## Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Group clustering | Color-only (same group = same hue) | FA2 naturally pulls same-group nodes together; avoids `@sigma/layer-webgl` complexity |
| Node shape | Custom WebGL rounded-rectangle, width fitted to label text | Visual continuity; rounded rects are more readable than circles/squares |
| Multi-select | Single select only (click node / click stage to clear) | Box select not in Sigma and not worth 100+ lines |
| Layouts | FA2 (default) + Dagre (hierarchical toggle) | Two useful layouts; 12+ layout switcher has no graphology equivalents |
| Export PNG | Temporarily removed (button hidden) | Sigma export requires `@sigma/export-image`; deferred to follow-up |
| Zoom/fit controls | Custom buttons calling `sigma.getCamera()` | `@react-sigma/core`'s ZoomControl lacks fit-to-graph and fit-selection |

---

## Architecture

### What changes in `store.jsx`

- Remove `CyContext`, `useCy`, the `cy` useState, and the `setCy` function — these are Cytoscape-specific. The Sigma instance is accessed via `useSigma()` inside `SigmaContainer` children instead.
- State shape (reducer, all action types) is otherwise unchanged.

### What does not change

- `graph/parseDot.js` — DOT parser is independent of renderer
- `panels/FilterPanel.jsx` — UI unchanged
- `panels/PomPanel.jsx` — unchanged
- Backend (`src/`) — unchanged

### New packages

```
sigma@3                              Sigma.js v3 core (WebGL renderer)
graphology@0.25                      Graph data model
@react-sigma/core@3                  React wrapper for Sigma v3
graphology-layout-forceatlas2@0.10   FA2 layout (worker + supervisor variants)
graphology-layout@0.6                circlepack, circular (seed layouts)
graphology-traversal@0.3             BFS/DFS for filter logic
@dagrejs/dagre@1                     Hierarchical layout
```

### Removed packages

```
cytoscape
cytoscape-cola
react-cytoscapejs
```

Note: `@dagrejs/graphlib-dot` is kept — it is used by `parseDot.js`.

---

## File-by-file Plan

### `store.jsx` (minor update)

Remove the three Cytoscape-specific pieces:
- `CyContext` constant
- `useCy` export
- `const [cy, setCy] = useState(null)` and the `CyContext.Provider` wrapper in `StoreProvider`

Everything else is unchanged.

### `graph/buildGraph.js` (replaces `buildElements.js`)

Converts the `nodeData` array (produced by `parseDot.js`) into a `graphology` directed `Graph` object.

- Adds each artifact as a node with attributes: `label`, `color` (chroma-js spectral per group), `group`, `root` (boolean), `x`/`y` (initial positions set to 0 — layout will place them), `size` (constant; Sigma requires this), `labelWidth` and `labelHeight` (measured via offscreen canvas — see below)
- Adds each dependency as a directed edge with `linkType` attribute (`compile`, `provided`, `test`, `grouping`)
- Applies `graphology-layout`'s `circlepack` grouped by `group` attribute as the initial seed positions, so FA2 converges quickly rather than starting from random

**Label dimension measurement:**

Pre-compute node bounding-box dimensions with an `OffscreenCanvas` so the custom node program can size rounded rectangles correctly:

```js
const canvas = new OffscreenCanvas(1, 1);
const ctx = canvas.getContext('2d');
ctx.font = '12px monospace';           // must match Sigma's labelFont setting
const { width } = ctx.measureText(label);
const PADDING = 16;                    // 8px each side
labelWidth  = Math.ceil(width) + PADDING;
labelHeight = 24;                      // fixed line height + padding
```

These values are stored as node attributes and read by the custom node program's vertex shader.

### `graph/nodeProgram.js` (replaces `stylesheet.js`)

Custom WebGL node program that renders rounded rectangles fitted to label text.

Sigma v3 exposes `AbstractNodeProgram` for subclassing WebGL programs. The correct import is:

```js
import { AbstractNodeProgram } from 'sigma/rendering/webgl/programs/common/node';
```

The program is registered via `SigmaContainer`'s `nodeProgramClasses` setting:

```js
<SigmaContainer settings={{ nodeProgramClasses: { rounded: RoundedRectProgram }, defaultNodeType: 'rounded', labelFont: '12px monospace' }} />
```

The `labelFont` setting **must match** the font used in `buildGraph.js`'s label measurement, or node boxes will be the wrong size.

**Implementation:**
- Vertex shader receives per-node `width` and `height` attributes (pre-measured and stored as node attributes in `buildGraph.js`)
- Fragment shader draws a rounded rectangle using a signed distance field (SDF) approach — standard GLSL technique, ~50 lines of shader code
- Root nodes receive a distinct `borderColor` attribute passed through to the fragment shader for a visible border ring
- Selected nodes: set `highlighted: true` via nodeReducer; the program renders a brighter fill when `highlighted` is true (passed as a float uniform or per-instance attribute)

### `graph/GraphEffects.jsx` (new file)

A component rendered **inside** `SigmaContainer` (so it can call `useSigma()`) that owns the composed nodeReducer and co-ordinates filter + layout effects. Has no rendered output (`return null`).

```jsx
// graph/GraphEffects.jsx
export function GraphEffects() {
    const sigma = useSigma();
    const graph = useGraph();
    const { state } = useStore();
    const { nodeFilter, edgeFilter, graphVersion } = state;

    const hoveredNodeRef  = useRef(null);
    const visibleIdsRef   = useRef(new Set());
    const edgeFilterRef   = useRef(edgeFilter);
    useEffect(() => { edgeFilterRef.current = edgeFilter; }, [edgeFilter]);

    // Install composed reducers once; close over refs so they always read latest values
    useEffect(() => {
        sigma.setSetting('nodeReducer', (nodeId, data) => {
            if (!visibleIdsRef.current.has(nodeId)) return { ...data, hidden: true };
            if (nodeId === hoveredNodeRef.current)  return { ...data, highlighted: true };
            return data;
        });
        sigma.setSetting('edgeReducer', (edgeId, data) => {
            const lt = graph.getEdgeAttribute(edgeId, 'linkType');
            return edgeFilterRef.current[lt] ? data : { ...data, hidden: true };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // installed once — refs keep it current

    // Update visibleIds and refresh when filter or graph changes
    useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef);

    // Layout management
    useLayout(sigma, graph, graphVersion);

    // Hover events
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

    return null;
}
```

**Key architectural point:** Both filter and hover write to refs rather than calling `setSetting('nodeReducer', ...)` themselves. Only one nodeReducer is ever registered (on mount). This prevents the two concerns from overwriting each other.

### `graph/useFilter.js` (rewrite)

Signature:

```js
export function useFilter(sigma, graph, nodeFilter, edgeFilter, graphVersion, visibleIdsRef)
```

Runs inside `GraphEffects` (inside `SigmaContainer`), so `sigma` and `graph` come from `useSigma()` / `useGraph()` in the parent.

**Logic:**

1. If `nodeFilter.text` is empty and `connected` is false → `visibleIdsRef.current = new Set(graph.nodes())` (all visible)
2. Otherwise: find all nodes whose `label` contains `nodeFilter.text` (case-insensitive substring)
3. If `connected: true`, run `bfsFromNode` from each matching node via `graphology-traversal`, respecting `direction` (`inbound`/`outbound`/`both`) and skipping edges whose `linkType` is filtered out by `edgeFilter`
4. Store the resulting `Set<nodeId>` in `visibleIdsRef.current`
5. Call `sigma.refresh()` to apply the updated nodeReducer

The `edgeReducer` on `sigma` handles edge visibility independently and is already set in `GraphEffects`.

### `graph/useLayout.js` (rewrite)

Exposes a `runLayout()` function and manages layout mode.

**FA2 mode (default):**
- Creates an `FA2Layout` supervisor (worker-based) with `barnesHutOptimize: true` and settings inferred via `forceAtlas2.inferSettings(graph)`
- Auto-stops after 5000ms via `setTimeout`; the timer is cleared on `stop`, `killed`, and `layoutError` events — not just on error
- `runLayout()` kills any existing worker and starts a fresh one

**Dagre mode:**
- Uses `@dagrejs/dagre` (not to be confused with `@dagrejs/graphlib-dot` which is already in the project)
- Synchronous bridge:

```js
import dagre from '@dagrejs/dagre';

const g = new dagre.graphlib.Graph();
g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 });
g.setDefaultEdgeLabel(() => ({}));

graph.forEachNode((id, attrs) => g.setNode(id, { width: attrs.labelWidth, height: attrs.labelHeight }));
graph.forEachEdge((_, attrs, src, tgt) => {
    if (attrs.linkType !== 'grouping') g.setEdge(src, tgt);
});

dagre.layout(g);

graph.forEachNode((id) => {
    const { x, y } = g.node(id);
    graph.setNodeAttribute(id, 'x', x);
    graph.setNodeAttribute(id, 'y', y);
});
sigma.refresh();
```

- Grouping edges are excluded from Dagre input (they are synthetic clustering edges, not real dependencies)
- `rankdir: 'LR'` (left-to-right) gives natural dependency flow; `nodesep`/`ranksep` tuned for readable label spacing
- `runLayout()` re-runs the dagre computation (useful after filter changes)

### `graph/Viewer.jsx` (rewrite)

```jsx
const sigmaSettings = {
    nodeProgramClasses: { rounded: RoundedRectProgram },
    defaultNodeType: 'rounded',
    labelFont: '12px monospace',
    labelColor: { color: '#fff' },
    minCameraRatio: 0.05,
    maxCameraRatio: 10,
    renderEdgeLabels: false,
};

export default function Viewer({ nodeData, loading }) {
    return (
        <SigmaContainer settings={sigmaSettings} style={{ width: '100%', height: '100%' }}>
            <GraphLoader nodeData={nodeData} />
            <GraphEffects />
            {loading && <LoadingOverlay />}
        </SigmaContainer>
    );
}
```

- `SigmaContainer` owns the Sigma instance; passes it via React context
- `GraphLoader`: calls `useLoadGraph()` on `nodeData` change; builds a graphology graph via `buildGraph.js` and loads it into Sigma. Also applies `circlepack` seed positions before handing off to `GraphEffects`.
- `GraphEffects`: all effects (filter, layout, events) — described above
- `onCyInit` prop removed — no longer needed

### `panels/Toolbar.jsx` (update)

- Replace the layout algorithm dropdown (12+ options) with a two-state toggle: **Force** (FA2) / **Hierarchy** (Dagre)
- "Re-run layout" button remains, calls `runLayout()`
- Source toggle (`artifacts` / `groups`) moved here from `FilterPanel` (keeps filter panel focused on filter concerns)
- Zoom controls: **custom buttons** calling `sigma.getCamera()` directly (NOT `@react-sigma/core`'s ZoomControl, which lacks fit-graph and fit-selection)

```js
const camera = sigma.getCamera();
const zoomIn  = () => camera.animatedZoom({ duration: 150 });
const zoomOut = () => camera.animatedUnzoom({ duration: 150 });
const fitAll  = () => sigma.getCamera().animatedReset({ duration: 200 });
```

For "fit selection": compute bounding box of selected node positions, then call `camera.animate({ x, y, ratio }, { duration: 200 })`.

- Export PNG button: **hidden** (removed from toolbar for this migration; deferred to a follow-up using `@sigma/export-image`)

### `App.jsx` (minor update)

- Remove `onCyInit` callback and `useCy` usage
- Remove `useFilter` and `useLayout` imports (these now live inside `GraphEffects` inside `SigmaContainer`)
- `<Viewer>` no longer receives `onCyInit` prop
- Source toggle display: moved from `FilterPanel` into `Toolbar` (both read/write `state.source` via store)

---

## Data Flow

```
PomPanel uploads pom.xml
  → POST /api/generate → Maven → .dot file
  → parseDot.js → nodeData array
  → store dispatch SET_GRAPH (graphVersion++)

store.nodeData / store.graphVersion changes
  → GraphLoader detects nodeData change (useEffect on nodeData reference)
  → buildGraph.js → graphology Graph (circlepack seed positions applied)
  → useLoadGraph(graph) → Sigma renders seed positions
  → GraphEffects.useLayout detects graphVersion change → starts FA2 Worker

User changes source toggle (artifacts ↔ groups):
  → store dispatch SET_SOURCE
  → nodeData reference changes (graph[source])
  → GraphLoader rebuilds graph → FA2 Worker restarts (same path as above)

User interacts with FilterPanel:
  → store dispatch SET_NODE_FILTER / SET_EDGE_FILTER
  → useFilter recomputes visibleIdsRef → sigma.refresh() (nodeReducer reads ref)

Toolbar layout toggle:
  → setLayoutMode → runLayout() via useLayout

Toolbar re-run button:
  → runLayout()

Click node:
  → GraphEffects EventHandler → store dispatch SET_SELECTION([nodeId])

Click stage:
  → GraphEffects EventHandler → store dispatch SET_SELECTION([])

Hover node:
  → GraphEffects EventHandler → hoveredNodeRef.current = nodeId → sigma.refresh()
```

---

## Error Handling

- FA2 worker errors are caught in the `layoutError` event; on error, fall back to the circlepack seed positions already applied (graph remains visible). Timer is cleared.
- Dagre bridge wraps in try/catch; on failure, logs and leaves current positions unchanged
- `buildGraph.js` validates that nodes have `id` and `label` attributes; malformed entries are skipped with a console warning
- If `OffscreenCanvas` is unavailable (very old browsers), fall back to fixed `labelWidth = 120` and `labelHeight = 24`

---

## Out of Scope

- Box select (single select only)
- More than two layout algorithms
- Contour hull group clustering (color-only for now)
- Edge gradient colors (single `color` per edge via `edgeReducer`)
- Export PNG (hidden for now; add later via `@sigma/export-image`)
- Tooltip on hover (hover highlight ring only)
