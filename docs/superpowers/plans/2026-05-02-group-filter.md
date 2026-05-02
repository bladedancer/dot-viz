# Group Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "includes filter" to "group filter" and apply it server-side on both `load-path` and `generate-path` so large graphs are trimmed before transmission.

**Architecture:** Add a `filterDotByGroup(dotText, groupFilter)` function in `src/generate.js` that strips nodes/edges from DOT text whose group prefix doesn't match the filter list. Wire it into both API endpoints in `src/index.js`. Update `PomPanel.jsx` to rename state and labels, and send `groupFilter` in the request body.

**Tech Stack:** Node.js/Express backend, React 18 frontend, no test framework configured (manual curl/browser testing).

---

### Task 1: Add `filterDotByGroup` to generate.js

**Files:**
- Modify: `src/generate.js`

- [ ] **Step 1: Open `src/generate.js` and add the filter function after the imports**

Add this function before `buildMvnArgs`:

```js
export function filterDotByGroup(dotText, groupFilter) {
    const prefixes = (groupFilter || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (!prefixes.length) return dotText;

    const lines = dotText.split('\n');
    // Collect node IDs whose group matches at least one prefix
    const allowed = new Set();
    for (const line of lines) {
        // Node lines look like:  "group:artifact" [label=...];
        const nodeMatch = line.match(/^\s*"([^"]+)"\s*\[/);
        if (nodeMatch) {
            const id = nodeMatch[1];
            const group = id.split(':')[0];
            if (prefixes.some((p) => group.startsWith(p))) {
                allowed.add(id);
            }
        }
    }

    // Emit header, allowed nodes, allowed edges, closing brace
    const result = [];
    for (const line of lines) {
        const nodeMatch = line.match(/^\s*"([^"]+)"\s*\[/);
        if (nodeMatch) {
            if (allowed.has(nodeMatch[1])) result.push(line);
            continue;
        }
        // Edge lines look like:  "group:artifact" -> "group:artifact" ...
        const edgeMatch = line.match(/^\s*"([^"]+)"\s*->\s*"([^"]+)"/);
        if (edgeMatch) {
            if (allowed.has(edgeMatch[1]) && allowed.has(edgeMatch[2])) result.push(line);
            continue;
        }
        result.push(line);
    }
    return result.join('\n');
}
```

- [ ] **Step 2: Rename `includes` → `groupFilter` in `buildMvnArgs`, `generateDot`, and `generateDotFromPath`**

Replace the existing functions with:

```js
function buildMvnArgs(pomFilePath, groupFilter) {
    const args = [
        'com.github.ferstl:depgraph-maven-plugin:aggregate',
        '-DshowGroupIds',
        '-DshowConflicts',
        '-DgraphFormat=dot',
        '-f', pomFilePath,
    ];
    if (groupFilter && groupFilter.trim()) {
        args.push(`-Dincludes=${groupFilter.trim()}`);
    }
    return args;
}
```

```js
export async function generateDot(pomContent, groupFilter) {
    const dir = await mkdtemp(join(tmpdir(), 'dot-viz-'));
    try {
        const pomFilePath = join(dir, 'pom.xml');
        await writeFile(pomFilePath, pomContent, 'utf8');
        await runMvn(buildMvnArgs(pomFilePath, groupFilter), dir);
        const dotPath = join(dir, 'target', 'dependency-graph.dot');
        const dot = await readFile(dotPath, 'utf8');
        return filterDotByGroup(dot, groupFilter);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
```

```js
export async function generateDotFromPath(pomPath, groupFilter) {
    const dir = dirname(pomPath);
    await runMvn(buildMvnArgs(pomPath, groupFilter), dir);
    const dotPath = join(dir, 'target', 'dependency-graph.dot');
    const dot = await readFile(dotPath, 'utf8');
    return filterDotByGroup(dot, groupFilter);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/generate.js
git commit -m "feat: add filterDotByGroup and rename includes→groupFilter in generate.js"
```

---

### Task 2: Wire `groupFilter` into both API endpoints in `src/index.js`

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Import `filterDotByGroup` at the top of `src/index.js`**

The existing import line is:
```js
import { generateDot, generateDotFromPath } from './generate.js';
```

Replace with:
```js
import { generateDot, generateDotFromPath, filterDotByGroup } from './generate.js';
```

- [ ] **Step 2: Update the `/api/load-path` handler to read `groupFilter` and apply the filter**

Find the existing handler:
```js
app.post('/api/load-path', async (req, res) => {
    const { pomPath } = req.body || {};
    if (!pomPath) return res.status(400).json({ error: 'pomPath is required' });
    const dotPath = join(dirname(pomPath), 'target', 'dependency-graph.dot');
    try {
        const dot = await readFile(dotPath, 'utf8');
        res.type('text/plain').send(dot);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(500).json({ error: `Could not read ${dotPath}: ${err.message}` });
        }
        log.error('load-path failed', err.message);
        res.status(500).json({ error: err.message });
    }
});
```

Replace with:
```js
app.post('/api/load-path', async (req, res) => {
    const { pomPath, groupFilter } = req.body || {};
    if (!pomPath) return res.status(400).json({ error: 'pomPath is required' });
    const dotPath = join(dirname(pomPath), 'target', 'dependency-graph.dot');
    try {
        const dot = await readFile(dotPath, 'utf8');
        res.type('text/plain').send(filterDotByGroup(dot, groupFilter || ''));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(500).json({ error: `Could not read ${dotPath}: ${err.message}` });
        }
        log.error('load-path failed', err.message);
        res.status(500).json({ error: err.message });
    }
});
```

- [ ] **Step 3: Update the `/api/generate-path` handler to read `groupFilter`**

Find:
```js
app.post('/api/generate-path', async (req, res) => {
    const { pomPath, includes } = req.body || {};
    if (!pomPath) return res.status(400).json({ error: 'pomPath is required' });
    try {
        const dot = await generateDotFromPath(pomPath, includes || '');
```

Replace with:
```js
app.post('/api/generate-path', async (req, res) => {
    const { pomPath, groupFilter } = req.body || {};
    if (!pomPath) return res.status(400).json({ error: 'pomPath is required' });
    try {
        const dot = await generateDotFromPath(pomPath, groupFilter || '');
```

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "feat: wire groupFilter into load-path and generate-path endpoints"
```

---

### Task 3: Update `PomPanel.jsx` — rename state and labels

**Files:**
- Modify: `client/src/panels/PomPanel.jsx`

- [ ] **Step 1: Replace the entire PomPanel component**

Replace the full file content with:

```jsx
import React, { useState, useCallback } from 'react';
import { useStore } from '../store.jsx';
import { parseDot } from '../graph/parseDot.js';

const PomPanel = () => {
    const { dispatch } = useStore();
    const [pomPath, setPomPath] = useState('');
    const [groupFilterEnabled, setGroupFilterEnabled] = useState(false);
    const [groupFilter, setGroupFilter] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const callApi = useCallback(async (endpoint, statusMsg) => {
        if (!pomPath.trim()) return;
        setBusy(true);
        setError(null);
        setStatus(statusMsg);
        dispatch({ type: 'SET_LOADING', loading: true });
        const effectiveGroupFilter = groupFilterEnabled ? groupFilter.trim() : '';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pomPath: pomPath.trim(), groupFilter: effectiveGroupFilter }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(body.error || res.statusText);
            }
            const dot = await res.text();
            dispatch({ type: 'SET_GRAPH', graph: parseDot(dot) });
            setStatus(null);
        } catch (err) {
            setError(err.message || String(err));
            setStatus(null);
        } finally {
            setBusy(false);
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    }, [pomPath, groupFilter, groupFilterEnabled, dispatch]);

    const load     = useCallback(() => callApi('/api/load-path',     'Loading dependency-graph.dot…'), [callApi]);
    const generate = useCallback(() => callApi('/api/generate-path', 'Running mvn depgraph:aggregate…'), [callApi]);
    const canAct   = !busy && pomPath.trim().length > 0;

    return (
        <div className="panel pom-panel">
            <input
                className="path-input"
                type="text"
                value={pomPath}
                onChange={(e) => setPomPath(e.target.value)}
                placeholder="/path/to/pom.xml"
                disabled={busy}
                onKeyDown={(e) => e.key === 'Enter' && canAct && load()}
            />

            <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={groupFilterEnabled}
                    onChange={(e) => setGroupFilterEnabled(e.target.checked)}
                    disabled={busy}
                />
                Group filter
            </label>

            {groupFilterEnabled && (
                <input
                    className="path-input"
                    type="text"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    placeholder="com.example,org.other"
                    disabled={busy}
                    onKeyDown={(e) => e.key === 'Enter' && canAct && load()}
                />
            )}

            <div className="button-row">
                <button className="btn btn-primary" onClick={load} disabled={!canAct}>
                    {busy && status?.startsWith('Load') ? <span className="spin">↻</span> : null}
                    {busy && status?.startsWith('Load') ? 'Loading…' : 'Load'}
                </button>
                <button className="btn" onClick={generate} disabled={!canAct}>
                    {busy && status?.startsWith('Run') ? <span className="spin">↻</span> : null}
                    {busy && status?.startsWith('Run') ? 'Generating…' : 'Generate'}
                </button>
            </div>

            {status && (
                <div className="status-msg">
                    <span className="status-dot" />
                    {status}
                </div>
            )}
            {error && <div className="error-msg">{error}</div>}
        </div>
    );
};

export default PomPanel;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/panels/PomPanel.jsx
git commit -m "feat: rename includes filter to group filter in PomPanel UI"
```

---

### Task 4: Manual smoke test

No automated test suite is configured. Verify manually:

- [ ] **Step 1: Start the server**

```bash
npm start
```

Expected: `Dot Viz listening on port 8080`

- [ ] **Step 2: Test `load-path` with no group filter**

```bash
curl -s -X POST http://localhost:8080/api/load-path \
  -H 'Content-Type: application/json' \
  -d '{"pomPath":"/path/to/your/pom.xml"}' | head -20
```

Expected: DOT graph text returned, same as before.

- [ ] **Step 3: Test `load-path` with a group filter**

```bash
curl -s -X POST http://localhost:8080/api/load-path \
  -H 'Content-Type: application/json' \
  -d '{"pomPath":"/path/to/your/pom.xml","groupFilter":"com.example"}' | head -30
```

Expected: DOT graph text with only nodes whose group starts with `com.example` and edges between those nodes.

- [ ] **Step 4: Open the UI in a browser at `http://localhost:8080`**

- Load a `.dot` file via the PomPanel
- Verify the checkbox now reads "Group filter" (not "Includes filter")
- Enable the group filter, enter one or two group prefixes, click Load
- Verify the graph contains only nodes from those groups

- [ ] **Step 5: Commit any fixups found during testing, then final commit**

```bash
git add -p
git commit -m "fix: group filter smoke test fixups"
```
