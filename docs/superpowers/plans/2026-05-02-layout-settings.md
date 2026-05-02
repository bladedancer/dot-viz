# Layout Settings Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings popover to the Toolbar that exposes Force (FA2) and Hierarchy (Dagre) layout parameters as sliders and dropdowns, applying changes immediately.

**Architecture:** `layoutSettings` is added to the global store; `useLayout.js` reads from it instead of hardcoded values; a new `LayoutPopover.jsx` component renders inside `Toolbar.jsx` and is toggled by clicking the active layout button; clicking outside closes it.

**Tech Stack:** React 18, graphology-layout-forceatlas2, @dagrejs/dagre, existing store/dispatch pattern.

---

## File Map

| File | Change |
|---|---|
| `client/src/store.jsx` | Add `layoutSettings` to initial state and `SET_LAYOUT_SETTINGS` reducer |
| `client/src/graph/useLayout.js` | Accept `layoutSettings` param; replace hardcoded values |
| `client/src/graph/GraphEffects.jsx` | Pass `layoutSettings` from store to `useLayout` |
| `client/src/panels/LayoutPopover.jsx` | **Create** — popover UI component |
| `client/src/panels/Toolbar.jsx` | Add toggle state, render `<LayoutPopover>`, click-away close |
| `client/src/theme.css` | Add popover CSS classes |

---

### Task 1: Add `layoutSettings` to the store

**Files:**
- Modify: `client/src/store.jsx`

- [ ] **Step 1: Add `layoutSettings` to `initialState`**

Open `client/src/store.jsx`. The current `initialState` ends with `selection: []`. Add `layoutSettings` after it:

```js
const initialState = {
    graph: { groups: [], artifacts: [] },
    graphVersion: 0,
    source: 'artifacts',
    loading: false,
    nodeFilter: { text: '', connected: false, direction: 'both' },
    edgeFilter: { compile: true, provided: true, test: false, grouping: true },
    selection: [],
    layoutSettings: {
        force: {
            gravity:       1,
            scalingRatio:  10,
            slowDown:      null,
            timeoutMs:     15000,
            linLogMode:    false,
            strongGravity: false,
        },
        dagre: {
            rankdir: 'LR',
            nodesep: 80,
            ranksep: 200,
            ranker:  'network-simplex',
        },
    },
};
```

- [ ] **Step 2: Add `SET_LAYOUT_SETTINGS` to the reducer**

In the `reducer` function, add a new case before `default`:

```js
case 'SET_LAYOUT_SETTINGS':
    return {
        ...state,
        layoutSettings: {
            force: { ...state.layoutSettings.force, ...(action.force || {}) },
            dagre: { ...state.layoutSettings.dagre, ...(action.dagre || {}) },
        },
    };
```

- [ ] **Step 3: Verify the store renders without errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/store.jsx
git commit -m "feat: add layoutSettings to store"
```

---

### Task 2: Update `useLayout.js` to consume `layoutSettings`

**Files:**
- Modify: `client/src/graph/useLayout.js`

- [ ] **Step 1: Update `startFA2` to accept and use `forceSettings`**

Replace the entire `startFA2` function:

```js
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
```

- [ ] **Step 2: Update `runDagre` to accept and use `dagreSettings`**

Replace the entire `runDagre` function:

```js
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
```

- [ ] **Step 3: Update `useLayout` signature and all internal call sites**

Replace the entire `useLayout` export:

```js
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
```

- [ ] **Step 4: Build to verify no errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/graph/useLayout.js
git commit -m "feat: useLayout accepts layoutSettings param instead of hardcoded values"
```

---

### Task 3: Update `GraphEffects.jsx` to pass `layoutSettings`

**Files:**
- Modify: `client/src/graph/GraphEffects.jsx`

- [ ] **Step 1: Destructure `layoutSettings` from store state and pass to `useLayout`**

Find this line in `GraphEffects`:

```js
const { nodeFilter, edgeFilter, graphVersion } = state;
```

Replace with:

```js
const { nodeFilter, edgeFilter, graphVersion, layoutSettings } = state;
```

Then find:

```js
const { layoutMode, setLayoutMode, runLayout } = useLayout(sigma, graph, graphVersion);
```

Replace with:

```js
const { layoutMode, setLayoutMode, runLayout } = useLayout(sigma, graph, graphVersion, layoutSettings);
```

- [ ] **Step 2: Build to verify no errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/graph/GraphEffects.jsx
git commit -m "feat: pass layoutSettings from store to useLayout"
```

---

### Task 4: Add popover CSS to `theme.css`

**Files:**
- Modify: `client/src/theme.css`

- [ ] **Step 1: Append popover styles to the end of `client/src/theme.css`**

Add the following block at the very end of the file:

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

- [ ] **Step 2: Commit**

```bash
git add client/src/theme.css
git commit -m "feat: add layout popover CSS classes"
```

---

### Task 5: Create `LayoutPopover.jsx`

**Files:**
- Create: `client/src/panels/LayoutPopover.jsx`

- [ ] **Step 1: Create the file with the full component**

```jsx
import React, { useEffect, useRef } from 'react';
import { useStore } from '../store.jsx';

const RANKDIR_OPTIONS = [
    { value: 'LR', label: 'Left → Right' },
    { value: 'TB', label: 'Top → Bottom' },
    { value: 'RL', label: 'Right → Left' },
    { value: 'BT', label: 'Bottom → Top' },
];

const RANKER_OPTIONS = [
    { value: 'network-simplex', label: 'Network simplex' },
    { value: 'tight-tree',      label: 'Tight tree' },
    { value: 'longest-path',    label: 'Longest path' },
];

function SliderRow({ label, value, min, max, step, display, onChange }) {
    return (
        <div className="popover-row">
            <span className="popover-label">{label}</span>
            <input
                type="range"
                className="popover-slider"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="popover-value">{display ?? value}</span>
        </div>
    );
}

function CheckRow({ label, checked, onChange }) {
    return (
        <label className="popover-row" style={{ cursor: 'pointer' }}>
            <span className="popover-label">{label}</span>
            <input
                type="checkbox"
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </label>
    );
}

function SelectRow({ label, value, options, onChange }) {
    return (
        <div className="popover-row">
            <span className="popover-label">{label}</span>
            <select
                className="popover-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

export default function LayoutPopover({ mode, onClose }) {
    const { state, dispatch } = useStore();
    const { force, dagre } = state.layoutSettings;
    const ref = useRef(null);

    const setForce = (patch) => dispatch({ type: 'SET_LAYOUT_SETTINGS', force: patch });
    const setDagre = (patch) => dispatch({ type: 'SET_LAYOUT_SETTINGS', dagre: patch });

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div className="layout-popover" ref={ref}>
            {mode === 'force' ? (
                <>
                    <div className="popover-title">Force settings</div>
                    <SliderRow
                        label="Gravity"
                        value={force.gravity}
                        min={0} max={5} step={0.1}
                        onChange={(v) => setForce({ gravity: v })}
                    />
                    <SliderRow
                        label="Scaling"
                        value={force.scalingRatio}
                        min={1} max={50} step={1}
                        onChange={(v) => setForce({ scalingRatio: v })}
                    />
                    <div className="popover-row">
                        <span className="popover-label">Slow down</span>
                        <input
                            type="range"
                            className="popover-slider"
                            min={1} max={20} step={0.5}
                            value={force.slowDown ?? 1}
                            onChange={(e) => setForce({ slowDown: Number(e.target.value) })}
                        />
                        <span className="popover-value">
                            {force.slowDown == null ? 'auto' : force.slowDown}
                        </span>
                    </div>
                    {force.slowDown != null && (
                        <button className="popover-reset" onClick={() => setForce({ slowDown: null })}>
                            reset to auto
                        </button>
                    )}
                    <SliderRow
                        label="Timeout (s)"
                        value={force.timeoutMs / 1000}
                        min={5} max={60} step={5}
                        onChange={(v) => setForce({ timeoutMs: v * 1000 })}
                    />
                    <CheckRow
                        label="LinLog mode"
                        checked={force.linLogMode}
                        onChange={(v) => setForce({ linLogMode: v })}
                    />
                    <CheckRow
                        label="Strong gravity"
                        checked={force.strongGravity}
                        onChange={(v) => setForce({ strongGravity: v })}
                    />
                </>
            ) : (
                <>
                    <div className="popover-title">Hierarchy settings</div>
                    <SelectRow
                        label="Direction"
                        value={dagre.rankdir}
                        options={RANKDIR_OPTIONS}
                        onChange={(v) => setDagre({ rankdir: v })}
                    />
                    <SliderRow
                        label="Node sep"
                        value={dagre.nodesep}
                        min={20} max={300} step={10}
                        onChange={(v) => setDagre({ nodesep: v })}
                    />
                    <SliderRow
                        label="Rank sep"
                        value={dagre.ranksep}
                        min={50} max={500} step={25}
                        onChange={(v) => setDagre({ ranksep: v })}
                    />
                    <SelectRow
                        label="Ranker"
                        value={dagre.ranker}
                        options={RANKER_OPTIONS}
                        onChange={(v) => setDagre({ ranker: v })}
                    />
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Build to verify no errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/panels/LayoutPopover.jsx
git commit -m "feat: add LayoutPopover component"
```

---

### Task 6: Wire `LayoutPopover` into `Toolbar.jsx`

**Files:**
- Modify: `client/src/panels/Toolbar.jsx`

- [ ] **Step 1: Replace the full contents of `Toolbar.jsx`**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import LayoutPopover from './LayoutPopover.jsx';

const Toolbar = () => {
    const { state, dispatch } = useStore();
    const [layoutMode, setLayoutMode] = useState('force');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const toolbarRef = useRef(null);

    useEffect(() => {
        const handler = (e) => setLayoutMode(e.detail);
        window.addEventListener('sigma:layout-mode-changed', handler);
        return () => window.removeEventListener('sigma:layout-mode-changed', handler);
    }, []);

    const rerun  = () => window.dispatchEvent(new Event('sigma:rerun-layout'));
    const fitAll = () => window.dispatchEvent(new Event('sigma:fit-all'));
    const fitSel = () => window.dispatchEvent(new CustomEvent('sigma:fit-selection', { detail: state.selection }));
    const zoomIn  = () => window.dispatchEvent(new CustomEvent('sigma:zoom', { detail: 1.3 }));
    const zoomOut = () => window.dispatchEvent(new CustomEvent('sigma:zoom', { detail: 1 / 1.3 }));

    const setMode = (mode) => {
        window.dispatchEvent(new CustomEvent('sigma:set-layout-mode', { detail: mode }));
        setLayoutMode(mode);
    };

    const handleForceBtn = () => {
        if (layoutMode === 'force') {
            setSettingsOpen((o) => !o);
        } else {
            setMode('force');
            setSettingsOpen(false);
        }
    };

    const handleHierarchyBtn = () => {
        if (layoutMode === 'hierarchy') {
            setSettingsOpen((o) => !o);
        } else {
            setMode('hierarchy');
            setSettingsOpen(false);
        }
    };

    const setSource = (s) => dispatch({ type: 'SET_SOURCE', source: s });
    const hasSelection = state.selection.length > 0;

    return (
        <div className="toolbar" ref={toolbarRef} style={{ position: 'relative' }}>
            {settingsOpen && (
                <LayoutPopover
                    mode={layoutMode}
                    onClose={() => setSettingsOpen(false)}
                />
            )}
            <button className="tool-btn" title="Zoom in"       onClick={zoomIn}>+</button>
            <button className="tool-btn" title="Zoom out"      onClick={zoomOut}>−</button>
            <button className="tool-btn" title="Fit graph"     onClick={fitAll}>⊡</button>
            <button className="tool-btn" title="Fit selection" onClick={fitSel} disabled={!hasSelection}>⊙</button>
            <div className="toolbar-sep" />
            <button
                className={`tool-btn${layoutMode === 'force' ? ' active' : ''}`}
                title="Force layout (FA2) — click to toggle settings"
                onClick={handleForceBtn}
            >⊛</button>
            <button
                className={`tool-btn${layoutMode === 'hierarchy' ? ' active' : ''}`}
                title="Hierarchy layout (Dagre) — click to toggle settings"
                onClick={handleHierarchyBtn}
            >⊞</button>
            <button className="tool-btn" title="Re-run layout" onClick={rerun}>⟳</button>
            <div className="toolbar-sep" />
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

- [ ] **Step 2: Build to verify no errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/panels/Toolbar.jsx
git commit -m "feat: wire LayoutPopover into Toolbar with toggle and click-away close"
```

---

### Task 7: Manual smoke test

No automated test suite. Verify visually.

- [ ] **Step 1: Start the dev server**

```bash
npm start &
npm run dev:client
```

Open `http://localhost:5173` (Vite dev server).

- [ ] **Step 2: Test Force mode popover**

- Load a `.dot` file (or generate one via PomPanel)
- Ensure Force layout (⊛) is active
- Click ⊛ — popover should appear above the toolbar with "Force settings"
- Adjust Gravity slider — layout should restart with new value
- Enable "Strong gravity" checkbox — layout should restart
- Move Slow down slider — value shows a number; "reset to auto" link appears; clicking it restores "auto"
- Adjust Timeout slider — readout shows the new value in seconds
- Click ⊛ again — popover should close
- Click elsewhere on the canvas — popover should close if open

- [ ] **Step 3: Test Hierarchy mode popover**

- Click ⊞ to switch to hierarchy mode — popover should close if it was open
- Click ⊞ again — popover should appear with "Hierarchy settings"
- Change Direction to "Top → Bottom" — layout re-runs immediately
- Adjust Node sep and Rank sep sliders — layout re-runs on each change
- Change Ranker dropdown — layout re-runs immediately
- Click ⊞ again — popover closes

- [ ] **Step 4: Test mode switching**

- Open Force popover (click ⊛)
- Click ⊞ — should switch to hierarchy mode AND close the popover
- Open Hierarchy popover (click ⊞)
- Click ⊛ — should switch to force mode AND close the popover

- [ ] **Step 5: Commit any fixups**

```bash
git add -p
git commit -m "fix: layout settings smoke test fixups"
```
