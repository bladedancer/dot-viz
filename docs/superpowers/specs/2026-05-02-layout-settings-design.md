---
title: Layout Settings Popover
date: 2026-05-02
status: approved
---

## Overview

Add a settings popover to the Toolbar that exposes the hardcoded layout parameters for both Force (FA2) and Hierarchy (Dagre) modes. Clicking the active layout button toggles the popover; changes apply immediately via sliders and dropdowns.

## Placement & Interaction

- Clicking the currently-active layout button (⊛ for force, ⊞ for hierarchy) toggles the popover open/closed.
- The popover is anchored above the toolbar, positioned at bottom-right of the viewport (above the toolbar card).
- Clicking outside the popover closes it.
- Open/closed state is local to `Toolbar.jsx` — not stored in the global store.
- The popover content changes contextually: Force fields shown when force mode is active, Dagre fields when hierarchy mode is active.

## State

### Store additions (`store.jsx`)

Add `layoutSettings` to `initialState`:

```js
layoutSettings: {
    force: {
        gravity:        1,
        scalingRatio:   10,
        slowDown:       null,   // null = auto (log(n)), number = override
        timeoutMs:      15000,
        linLogMode:     false,
        strongGravity:  false,
    },
    dagre: {
        rankdir:    'LR',
        nodesep:    80,
        ranksep:    200,
        ranker:     'network-simplex',
    },
},
```

Add reducer case:

```js
case 'SET_LAYOUT_SETTINGS':
    return {
        ...state,
        layoutSettings: {
            force: { ...state.layoutSettings.force, ...action.force },
            dagre: { ...state.layoutSettings.dagre, ...action.dagre },
        },
    };
```

`action` carries optional `force` and/or `dagre` partial objects; unspecified keys are preserved.

## Components

### `LayoutPopover.jsx` (`client/src/panels/`)

New presentational component. Rendered inside `Toolbar.jsx`'s root div.

Props:
- `mode`: `'force' | 'hierarchy'` — controls which fields are shown
- `onClose`: called when user clicks outside

Reads `state.layoutSettings` from store. Dispatches `SET_LAYOUT_SETTINGS` on change.

**Force fields:**

| Label | Key | Control | Range | Default | Step |
|---|---|---|---|---|---|
| Gravity | `force.gravity` | slider + readout | 0–5 | 1 | 0.1 |
| Scaling | `force.scalingRatio` | slider + readout | 1–50 | 10 | 1 |
| Slow down | `force.slowDown` | slider + readout | 1–20 | auto | 0.5 |
| Timeout (s) | `force.timeoutMs` | slider + readout | 5–60 (×1000) | 15 | 5 |
| LinLog mode | `force.linLogMode` | checkbox | — | off | — |
| Strong gravity | `force.strongGravity` | checkbox | — | off | — |

Slow down slider: `null` displays as "auto"; moving the slider from the leftmost position sets a numeric value; a reset link restores `null`.

**Dagre fields:**

| Label | Key | Control | Options / Range | Default |
|---|---|---|---|---|
| Direction | `dagre.rankdir` | dropdown | LR / TB / RL / BT | LR |
| Node sep | `dagre.nodesep` | slider + readout | 20–300, step 10 | 80 |
| Rank sep | `dagre.ranksep` | slider + readout | 50–500, step 25 | 200 |
| Ranker | `dagre.ranker` | dropdown | network-simplex / tight-tree / longest-path | network-simplex |

**Positioning:** `position: absolute; bottom: 100%; right: 0; margin-bottom: 8px` inside the Toolbar's relative container.

### `Toolbar.jsx` changes

- Add local `const [settingsOpen, setSettingsOpen] = useState(false)`.
- Clicking the active layout button toggles `settingsOpen`; clicking the inactive button switches mode and closes settings.
- Render `<LayoutPopover>` conditionally when `settingsOpen`.
- Attach a `useEffect` that listens for `mousedown` on `document` to close popover when clicking outside (standard click-away pattern).

## `useLayout.js` changes

`startFA2` and `runDagre` accept a settings argument:

```js
function startFA2(graph, sigma, supervisorRef, timerRef, forceSettings) { ... }
function runDagre(graph, sigma, dagreSettings) { ... }
```

Inside `startFA2`, replace hardcoded values:

```js
const supervisor = new FA2Layout(graph, {
    settings: {
        ...inferred,
        barnesHutOptimize: graph.order > 200,
        gravity:       forceSettings.gravity,
        scalingRatio:  forceSettings.scalingRatio,
        slowDown:      forceSettings.slowDown ?? Math.max(1, Math.log(graph.order)),
        linLogMode:    forceSettings.linLogMode,
        strongGravityMode: forceSettings.strongGravity,
    },
});
// timeout uses forceSettings.timeoutMs
```

Inside `runDagre`, replace hardcoded values:

```js
g.setGraph({
    rankdir: dagreSettings.rankdir,
    nodesep: dagreSettings.nodesep,
    ranksep: dagreSettings.ranksep,
    ranker:  dagreSettings.ranker,
});
```

## `GraphEffects.jsx` changes

Pass `layoutSettings` from store to `useLayout`:

```js
const { nodeFilter, edgeFilter, graphVersion, layoutSettings } = state;
const { layoutMode, setLayoutMode, runLayout } = useLayout(sigma, graph, graphVersion, layoutSettings);
```

`useLayout` signature becomes:
```js
export function useLayout(sigma, graph, graphVersion, layoutSettings)
```

Layout re-runs when `layoutSettings` changes (add to the `useEffect` dependency array). For force mode, this restarts the FA2 worker with new settings. For dagre mode, this re-runs dagre immediately.

## CSS additions (`theme.css`)

```css
/* ── Layout popover ──────────────────────────────────────────────────────── */
.layout-popover {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 8px;
    width: 210px;
    background: var(--bg1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    z-index: 200;
}

.popover-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.popover-label {
    color: var(--text-dim);
    font-size: 11px;
    flex: 1;
    white-space: nowrap;
}

.popover-slider {
    flex: 1;
    accent-color: var(--accent);
    cursor: pointer;
}

.popover-value {
    color: var(--text);
    font-size: 11px;
    width: 32px;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
}

.popover-select {
    flex: 1;
    background: var(--bg0);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 11px;
    padding: 3px 6px;
}

.popover-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
}

.popover-reset {
    font-size: 10px;
    color: var(--accent);
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline;
    align-self: flex-end;
}
```

## Out of Scope

- Persisting settings across page reload (no localStorage)
- Resetting individual fields to defaults (except the slow-down auto reset link)
- Visual/rendering knobs (`hideEdgesOnMove`, `renderEdgeLabels`, edge colour)
