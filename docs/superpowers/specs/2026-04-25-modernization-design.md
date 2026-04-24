# dot-viz Modernization Design

## Context

dot-viz is a React 17 + Express + Cytoscape.js visualization app for DOT-format dependency graphs. A code review identified correctness bugs (event listener leaks, memory leaks, deprecated APIs) and structural issues (1900-line component, brittle parser, `window` globals). This spec covers all three phases of work plus Playwright-based end-to-end verification after each phase.

---

## Phase A — Correctness & Reliability Fixes

Small, targeted changes. Low risk. Ship first.

### A1. React 18 upgrade (`index.jsx`)
Replace `ReactDOM.render` (deprecated) with `createRoot`. Remove the unused `Component` import.

```jsx
// before
ReactDOM.render(<App />, document.getElementById('root'));

// after
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App />);
```

Upgrade `react` and `react-dom` to `^18.3.1` in `package.json`. Also update `react-cytoscapejs` if needed for React 18 compatibility.

### A2. `window.cy` → React Context (`useCy.js`, `Graph.jsx`)
`useCy.js` currently returns `window.cy`. Replace with a React Context so the Cytoscape instance flows through the component tree.

- Create `CytoscapeContext` in `client/src/hooks/useCy.js` alongside the existing `useCy()` hook
- `Graph.jsx` sets the ref via a callback ref on `<CytoscapeComponent>` and stores it in context via a provider
- All consumers (`FilterControl`, `LayoutControl`, `ExportControl`, `ZoomControl`) call `useCy()` as before — no call-site changes needed

`CytoscapeComponent` exposes a `cy` prop callback: `cy={(c) => { window.cy = c }}` today. Change to store via context setter instead.

### A3. Event listener cleanup (`Graph.jsx`)
The three `cy.on(...)` calls in Graph have no cleanup, causing handlers to accumulate on re-render:

```jsx
// add cleanup
useEffect(() => {
    if (!cy) return;
    const handleSelect = () => setSelection(cy.nodes().filter(':selected'));
    cy.on('select unselect boxselect', handleSelect);
    return () => cy.off('select unselect boxselect', handleSelect);
}, [cy]);
```

Also remove the `useRef(setSelection)` / `setSel.current` workaround — it's unnecessary once the effect has proper cleanup.

### A4. Memoize element generation (`Graph.jsx`)
The `useEffect` that converts `nodeData` → Cytoscape elements calls `setElements` + `bumpLayoutTrigger`. The element computation itself should be `useMemo` so it doesn't re-run on unrelated state changes. The `useEffect` then just reacts to the memoized value.

Also replace the `nodeData.find(...)` O(n) lookup for target nodes with a `Map` built once per `nodeData` array.

### A5. `FileReader` → `file.text()` (`nodes.js`)
Replace the manual `FileReader` promise wrapper with the modern `File.text()` API:

```js
// before: 12 lines of FileReader boilerplate
// after:
const readDot = (file) => file.text().then(parseDot);
```

Also remove the `var` → `const`, and fix the unused `nodify` wrapper (export `readDot` directly or keep wrapper but make it a one-liner).

### A6. Export error handling (`ExportControl.jsx`)
Add `try/catch/finally` so the busy spinner always clears:

```jsx
const exportCy = useCallback(async () => {
    setBusy(true);
    try {
        const img = await cy.png({ full: true, scale: 1, output: 'blob-promise' });
        saveAs(img, 'graph.png');
    } catch (err) {
        console.error('Export failed:', err);
    } finally {
        setBusy(false);
    }
}, [cy]);
```

### A7. Debounce cleanup (`FilterControl.jsx`)
The manual `setTimeout`/`clearTimeout` debounce doesn't cancel on unmount. Two options: install `use-debounce` (small library, `useDebouncedCallback`) or add a `useEffect` cleanup. Use `use-debounce` for clarity.

---

## Phase B — Structural Refactors

Larger changes. Each is independently testable after Phase A is green.

### B1. Extract LayoutControl layout configs
`LayoutControl.jsx` is 1929 lines, ~1700 of which are the `supportedLayouts` object. Extract each layout into its own file:

```
client/src/layouts/
  index.js          ← re-exports all, registers Cytoscape plugins
  avsdf.js
  breadthfirst.js
  circle.js
  concentric.js
  cola.js
  cose.js
  cose-bilkent.js
  cise.js
  euler.js
  fcose.js
  grid.js
  klay.js
  random.js
```

Each file exports a plain config object `{ name, schema, ...defaults }`. `index.js` imports them all and also does all the `Cytoscape.use(...)` plugin registration (currently scattered across LayoutControl's top).

LayoutControl becomes ~200 lines of component logic only.

Also fix the mutation inside `useMemo`:
```js
// before: mutates supportedLayouts inside useMemo (side effect in pure fn)
// after: return a new merged object
const layouts = useMemo(() =>
    Object.fromEntries(
        Object.entries(supportedLayouts).map(([k, v]) => [
            k,
            layoutOverrides[k] ? { ...v, ...layoutOverrides[k] } : v,
        ])
    ),
[layoutOverrides]);
```

Remove the unused `hash()` function. Remove the dead imports (`async` from `regenerator-runtime`, `e` from `cors`).

### B2. Replace DOT parser with `@dagrejs/graphlib-dot`
Install `@dagrejs/graphlib-dot`. Rewrite `nodes.js`:

- `parseDot(text)` uses `graphlibDot.read(text)` to get a proper graph object
- Walk `graph.nodes()` and `graph.edges()` to build the same `{ groups, artifacts }` output shape the rest of the app expects
- Preserve all existing downstream logic: grouping edges, colorization, root detection, link merging
- Keep the same default export (`nodify(file)`) so no call-site changes needed

Error handling improves naturally: the parser throws a real error with line info on invalid DOT.

### B3. Split FilterControl's monolithic `useEffect`
The single 90-line `useEffect` handles three distinct concerns. Extract into three focused hooks in `client/src/hooks/`:

- `useFilterNodes(cy, nodeFilter)` — show/hide nodes by label regex or ID list
- `useFilterEdges(cy, edgeFilter)` — show/hide edges by type
- `useFilterConnected(cy, nodeFilter, edgeFilter)` — A\* pathfinding for connected-node expansion

`FilterControl.jsx` calls all three. Each hook has its own dependency array and can be reasoned about independently.

Fix `==` → `===` for all string comparisons in the filtering logic.

---

## Phase C — Build Tooling Migration (Webpack → Vite)

### C1. Migrate to Vite
Replace Webpack + Babel with Vite:

```
package.json changes:
  remove: webpack, webpack-cli, babel-loader, babel-core, @babel/preset-*, css-loader, style-loader, @svgr/webpack, babel.config.json, webpack.config.cjs
  add: vite, @vitejs/plugin-react

new: vite.config.js
```

Vite config:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: { outDir: 'client/dist' },
    root: 'client',
});
```

Update `package.json` scripts:
```json
"dev:client": "vite",
"build": "vite build",
"preview": "vite preview"
```

The `index.html` moves to `client/` (Vite's root). Update the script tag from `bundle.js` to Vite's convention.

No `.svg` files are imported in the source — only `react-icons` components. Remove `@svgr/webpack` entirely; no replacement needed.

### C2. Dependency cleanup
While touching `package.json`:
- Upgrade `nodemon` `1.3.3` → `3.x`
- Upgrade `cytoscape` `3.21.1` → latest `3.x`
- Upgrade `react-icons` `4.x` → `5.x`
- Remove `regenerator-runtime` (not needed with Vite + modern targets)
- Remove `cli-spinners`, `fast-xml-parser`, `jsonpath-plus`, `@zip.js/zip.js` if unused

---

## Playwright Testing Strategy

After each phase, run a Playwright test suite that covers the golden path:

1. **App loads** — page renders without console errors
2. **File upload** — upload a sample `.dot` file, verify nodes appear in the graph
3. **Source toggle** — switch between Artifacts and Groups views
4. **Filter** — type in the filter input, verify nodes hide/show
5. **Edge filter toggles** — toggle Compile/Test/etc., verify edges hide/show
6. **Layout change** — select a different layout, verify graph re-renders
7. **Export** — click Export PNG, verify download is triggered
8. **Zoom controls** — zoom in/out/fit

A sample `.dot` test fixture (small, 5–10 nodes) lives at `test/fixtures/sample.dot`.

Tests live in `test/e2e/` and use `@playwright/test`. Run with `npx playwright test`.

---

## Files Modified Per Phase

**Phase A:**
- `package.json` (React 18, use-debounce)
- `client/src/index.jsx`
- `client/src/hooks/useCy.js`
- `client/src/components/Graph.jsx`
- `client/src/components/controls/ExportControl.jsx`
- `client/src/components/controls/FilterControl.jsx`
- `client/src/utils/nodes.js`

**Phase B:**
- `client/src/layouts/` (new directory, ~14 files)
- `client/src/components/controls/LayoutControl.jsx` (shrinks to ~200 lines)
- `client/src/utils/nodes.js` (rewrite)
- `client/src/hooks/useFilterNodes.js` (new)
- `client/src/hooks/useFilterEdges.js` (new)
- `client/src/hooks/useFilterConnected.js` (new)
- `client/src/components/controls/FilterControl.jsx` (simplified)

**Phase C:**
- `package.json`
- `vite.config.js` (new)
- `client/index.html` (move + update)
- `webpack.config.cjs` (delete)
- `babel.config.json` (delete)

---

## Verification

Each phase ends with:
1. `npm run build` succeeds
2. `npm start` + manual smoke test in browser
3. `npx playwright test` all green
