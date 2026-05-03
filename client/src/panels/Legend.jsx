import React, { useMemo } from 'react';
import { useStore } from '../store.jsx';

export default function Legend() {
    const { state, dispatch } = useStore();
    const { graph, source, groupSelection } = state;
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

    const selected = new Set(groupSelection);

    const toggle = (group) => {
        const next = new Set(selected);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        dispatch({ type: 'SET_GROUP_SELECTION', groupSelection: [...next] });
    };

    const clearAll = () => dispatch({ type: 'SET_GROUP_SELECTION', groupSelection: [] });

    return (
        <div className="panel legend">
            {selected.size > 0 && (
                <button className="legend-clear" onClick={clearAll}>clear filter</button>
            )}
            {entries.map(([group, color]) => {
                const active = selected.has(group);
                return (
                    <div
                        key={group}
                        className={`legend-row${active ? ' active' : ''}${selected.size > 0 && !active ? ' dimmed' : ''}`}
                        onClick={() => toggle(group)}
                        title={group}
                    >
                        <span className="legend-swatch" style={{ background: color }} />
                        <span className="legend-label">{group}</span>
                    </div>
                );
            })}
        </div>
    );
}
