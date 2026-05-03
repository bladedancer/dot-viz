import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';

export default function Legend() {
    const { state } = useStore();
    const { graph, source } = state;
    const nodeData = graph[source] || [];

    const entries = useMemo(() => {
        const seen = new Map();
        for (const n of nodeData) {
            if (n.group && n.color && !seen.has(n.group)) {
                seen.set(n.group, n.color);
            }
        }
        return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [nodeData]);

    if (!entries.length) return null;

    return (
        <div className="panel legend">
            {entries.map(([group, color]) => (
                <div key={group} className="legend-row">
                    <span className="legend-swatch" style={{ background: color }} />
                    <span className="legend-label">{group}</span>
                </div>
            ))}
        </div>
    );
}
