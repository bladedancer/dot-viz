import React, { useState, useRef, useCallback } from 'react';
import { FiSettings, FiRefreshCw } from 'react-icons/fi';
import { useSetNodeData, useSetLoading } from '../../hooks/useSettings.js';
import { parseDot } from '../../utils/nodes.js';
import './pomcontrol.css';

const PomControl = () => {
    const pomFile = useRef();
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [includes, setIncludes] = useState('');
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);
    const { setNodeData } = useSetNodeData();
    const { setLoading } = useSetLoading();

    const generate = useCallback(async (file) => {
        if (!file) return;
        setBusy(true);
        setLoading(true);
        setError(null);
        setStatus('Running mvn depgraph:aggregate…');
        try {
            const form = new FormData();
            form.append('pom', file);
            form.append('includes', includes);

            const res = await fetch('/api/generate', { method: 'POST', body: form });
            if (!res.ok) {
                const body = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(body.error || res.statusText);
            }
            const dot = await res.text();
            const nodes = parseDot(dot);
            setNodeData(nodes);
            setStatus(null);
        } catch (err) {
            setError(err.message || String(err));
            setStatus(null);
        } finally {
            setBusy(false);
            setLoading(false);
        }
    }, [includes, setNodeData, setLoading]);

    const onFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    }, []);

    const onOpenClick = useCallback(() => {
        pomFile.current.value = '';
        setSelectedFile(null);
        setError(null);
    }, []);

    return (
        <div className="react-cy-control pom-control">
            <label
                htmlFor={busy ? undefined : 'pomFile'}
                className="pom-open-btn"
                style={{ cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
                aria-disabled={busy}
                onClick={!busy ? onOpenClick : undefined}
            >
                {busy ? <FiRefreshCw /> : <FiSettings />}
                Open pom.xml
            </label>
            <input
                ref={pomFile}
                id="pomFile"
                type="file"
                accept=".xml"
                style={{ display: 'none' }}
                onChange={onFileChange}
                disabled={busy}
            />

            {selectedFile && (
                <div className="pom-includes">
                    <label htmlFor="pomIncludes">Includes filter (optional)</label>
                    <div className="pom-includes-row">
                        <input
                            id="pomIncludes"
                            type="text"
                            value={includes}
                            onChange={(e) => setIncludes(e.target.value)}
                            placeholder="com.example*"
                            disabled={busy}
                        />
                        <button
                            className="generate-btn"
                            onClick={() => generate(selectedFile)}
                            disabled={busy}
                        >
                            {busy ? <FiRefreshCw /> : '↻'} Generate
                        </button>
                    </div>
                    <span className="pom-includes-hint">Maven -Dincludes pattern · blank = all deps</span>
                </div>
            )}

            {status && (
                <div className="pom-status">
                    <span className="pom-status-dot" />
                    {status}
                </div>
            )}
            {error && <div className="pom-control-error">{error}</div>}
        </div>
    );
};

export default PomControl;
