import React, { useState, useCallback } from 'react';
import { useStore } from '../store.jsx';
import { parseDot } from '../graph/parseDot.js';

const PomPanel = () => {
    const { dispatch } = useStore();
    const [pomPath, setPomPath] = useState('');
    const [includesEnabled, setIncludesEnabled] = useState(false);
    const [includes, setIncludes] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const callApi = useCallback(async (endpoint, statusMsg) => {
        if (!pomPath.trim()) return;
        setBusy(true);
        setError(null);
        setStatus(statusMsg);
        dispatch({ type: 'SET_LOADING', loading: true });
        const effectiveIncludes = includesEnabled ? includes.trim() : '';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pomPath: pomPath.trim(), includes: effectiveIncludes }),
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
    }, [pomPath, includes, includesEnabled, dispatch]);

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
                    checked={includesEnabled}
                    onChange={(e) => setIncludesEnabled(e.target.checked)}
                    disabled={busy}
                />
                Includes filter
            </label>

            {includesEnabled && (
                <input
                    className="path-input"
                    type="text"
                    value={includes}
                    onChange={(e) => setIncludes(e.target.value)}
                    placeholder="com.example*"
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
