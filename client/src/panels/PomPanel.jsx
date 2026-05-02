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
