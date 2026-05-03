import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useStore } from '../store.jsx';

const EDGE_TYPES = [
    { key: 'compile',  label: 'Compile' },
    { key: 'provided', label: 'Provided' },
    { key: 'test',     label: 'Test' },
    { key: 'grouping', label: 'Grouping' },
];

const FilterPanel = () => {
    const { state, dispatch } = useStore();
    const { nodeFilter, edgeFilter } = state;

    const setNodeFilter = (nf) => dispatch({ type: 'SET_NODE_FILTER', nodeFilter: nf });
    const setEdgeFilter = (ef) => dispatch({ type: 'SET_EDGE_FILTER', edgeFilter: ef });

    const debouncedText = useDebouncedCallback(
        (text) => setNodeFilter({ text }),
        200
    );

    return (
        <div className="panel filter-panel">
            <input
                className="path-input"
                type="text"
                placeholder="Filter nodes…"
                defaultValue={nodeFilter.text}
                onChange={(e) => debouncedText(e.target.value)}
            />

            <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={nodeFilter.connected}
                    onChange={(e) => setNodeFilter({ connected: e.target.checked })}
                />
                Filter to selection + connected
            </label>

            {nodeFilter.connected && (
                <div className="seg-control">
                    {['both', 'inbound', 'outbound'].map((d) => (
                        <button
                            key={d}
                            className={`seg-btn${nodeFilter.direction === d ? ' active' : ''}`}
                            onClick={() => setNodeFilter({ direction: d })}
                        >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            <div className="divider" />
            {EDGE_TYPES.map(({ key, label }) => (
                <label key={key} className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={edgeFilter[key]}
                        onChange={(e) => setEdgeFilter({ [key]: e.target.checked })}
                    />
                    {label}
                </label>
            ))}
        </div>
    );
};

export default FilterPanel;
