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

---

## Architecture

### What does not change

- `store.jsx` — state shape is renderer-agnostic; reducer and all dispatch actions unchanged. `CyContext` / `useCy` are removed (Cytoscape-specific); Sigma instance is accessed via `useSigma()` from `@react-sigma/core` inside `SigmaContainer`.
- `graph/parseDot.js` — DOT parser is independent of renderer
- `panels/PomPanel.jsx` — unchanged
- `panels/FilterPanel.jsx` — UI unchanged
- Backend (`src/`) — unchanged

### New packages

```
@react-sigma/core       React wrapper for Sigma v3
sigma                   Sigma.js v3 core
graphology              Graph data model
graphology-layout-forceatlas2   FA2 layout (worker variant)
graphology-layout       circlepack, circular (seed layouts)
graphology-traversal    BFS/DFS for filter logic
graphology-shortest-path   A* / Dijkstra for connected-node filtering
dagre                   Hierarchical layout (used via bridge)
@sigma/node-square      Base for custom node program
```

### Removed packages

```
cytoscape
cytoscape-cola
react-cytoscapejs
```

---

## File-by-file Plan

### `graph/buildGraph.js` (replaces `buildElements.js`)

Converts the `nodeData` array (produced by `parseDot.js`) into a `graphology` directed `Graph` object.

- Adds each artifact as a node with attributes: `label`, `color` (chroma-js spectral per group), `group`, `root` (boolean), `x`/`y` (initial positions set to 0 — layout will place them), `labelWidth`/`labelHeight` (measured via offscreen canvas for the custom node program)
- Adds each dependency as a directed edge with `linkType` attribute (`compile`, `provided`, `test`, `grouping`)
- Applies `graphology-layout`'s `circlepack` grouped by `group` attribute as the initial seed positions, so FA2 converges quickly rather than starting from random

### `graph/nodeProgram.js` (replaces `stylesheet.js`)

Custom WebGL node program that renders rounded rectangles fitted to label text.

- Subclasses Sigma's `AbstractNodeProgram`
- Vertex shader receives per-node `width` and `height` attributes (pre-measured and stored as node attributes in `buildGraph.js`)
- Fragment shader draws a rounded rectangle using a signed distance field (SDF) approach — standard GLSL technique, ~50 lines of shader code
- Root nodes receive a distinct `borderColor` attribute passed through to the fragment shader

### `graph/Viewer.jsx` (rewrite)

```
<SigmaContainer settings={sigmaSettings} style={{ width: '100%', height: '100%' }}>
  <GraphLoader nodeData={nodeData} />
  <EventHandler />
  {loading && <LoadingOverlay />}
</SigmaContainer>
```

- `SigmaContainer` owns the Sigma instance; passes it via React context
- `GraphLoader` child: calls `useLoadGraph()` on `nodeData` change, builds a graphology graph via `buildGraph.js`, loads it into Sigma
- `EventHandler` child: uses `useRegisterEvents()` to wire `clickNode` → `SET_SELECTION`, `clickStage` → clear selection, `enterNode`/`leaveNode` → updates a `hoveredNode` ref used by the composed `nodeReducer`
- `onCyInit` callback removed — Sigma instance is accessed via `useSigma()` inside any child of `SigmaContainer`

### `graph/useFilter.js` (rewrite)

Sigma reducer-based filter replacing Cytoscape's imperative `.hide()`.

**Text + connected-node filter:**
1. Find all nodes whose `label` matches the text filter (case-insensitive substring)
2. If `connected: true`, run `bfsFromNode` from each matching node via `graphology-traversal`, respecting the `direction` setting (`inbound`/`outbound`/`both`) and skipping edges whose `linkType` is hidden by `edgeFilter`
3. Produce a `Set<nodeId>` of visible nodes

**Reducer application:**

A single composed `nodeReducer` is set once (in `GraphEffects`) and reads from both filter state and hover state, so the two concerns never overwrite each other:

```js
sigma.setSetting('nodeReducer', (nodeId, data) => {
  if (!visibleNodeIds.has(nodeId)) return { ...data, hidden: true };
  if (nodeId === hoveredNodeRef.current) return { ...data, highlighted: true };
  return data;
});
sigma.setSetting('edgeReducer', (edgeId, data) => {
  const lt = graph.getEdgeAttribute(edgeId, 'linkType');
  return edgeFilter[lt] ? data : { ...data, hidden: true };
});
sigma.refresh();
```

### `graph/useLayout.js` (rewrite)

Exposes `{ runLayout, layoutMode, setLayoutMode }`.

**FA2 mode (default):**
- Creates `FA2Layout` worker instance with `barnesHutOptimize: true` and settings inferred via `forceAtlas2.inferSettings(graph)`
- Auto-stops after 5000ms via `setTimeout`; clears timer on `layoutStop` event
- `runLayout()` kills existing worker and starts a fresh one

**Dagre mode:**
- Synchronous bridge: runs `dagre.layout(dagreGraph)` where `dagreGraph` is built by copying nodes/edges from the graphology graph
- Extracts `node.x`/`node.y` from dagre output and applies to graphology node attributes via `graph.setNodeAttribute`
- Calls `sigma.refresh()` — no animation, instant placement
- `runLayout()` re-runs the dagre computation (useful after filter changes)

### `panels/Toolbar.jsx` (minor update)

- Replace the layout algorithm dropdown (12+ options) with a two-state toggle: **Force** (FA2) / **Hierarchy** (Dagre)
- "Re-run layout" button remains, calls `runLayout()`
- Source toggle (`artifacts` / `groups`) unchanged
- Zoom controls replaced by `ZoomControl` from `@react-sigma/core`

### `App.jsx` (minor update)

- Remove `onCyInit` callback prop from `<Viewer>`
- Read Sigma instance via `useSigma()` inside a child of `SigmaContainer`
- `useFilter` and `useLayout` hooks move into a `GraphEffects` child component rendered inside `SigmaContainer` (so they can access the Sigma instance via context)

---

## Data Flow

```
PomPanel uploads pom.xml
  → POST /api/generate → Maven → .dot file
  → parseDot.js → nodeData array
  → store dispatch SET_GRAPH

store.graphVersion bumps
  → GraphLoader detects nodeData change
  → buildGraph.js → graphology Graph (with circlepack seed positions)
  → useLoadGraph(graph) → Sigma renders initial positions
  → useLayout detects graphVersion change → starts FA2 Worker

User interacts:
  FilterPanel → store dispatch SET_NODE_FILTER / SET_EDGE_FILTER
    → useFilter recomputes visibleNodeIds → nodeReducer/edgeReducer → sigma.refresh()

  Toolbar layout toggle → setLayoutMode → runLayout()
  Toolbar re-run → runLayout()

  Click node → EventHandler → store dispatch SET_SELECTION
  Click stage → EventHandler → store dispatch SET_SELECTION (empty)
```

---

## Error Handling

- FA2 worker errors are caught in the `layoutError` event; on error, fall back to the circlepack seed positions already applied (graph remains visible)
- Dagre bridge wraps in try/catch; on failure, logs and leaves current positions unchanged
- `buildGraph.js` validates that nodes have `id` and `label` attributes; malformed entries are skipped with a console warning

---

## Out of Scope

- Box select (single select only)
- More than two layout algorithms
- Contour hull group clustering (color-only for now)
- Edge gradient colors (single `color` per edge via `edgeReducer`)
- Export PNG (can be added later via `@sigma/export-image`)
- Tooltip on hover (hover highlight ring only)
