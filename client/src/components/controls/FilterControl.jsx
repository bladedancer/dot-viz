import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useCy } from '../../hooks/useCy.js';
import {
    useSetNodeFilter,
    useSetEdgeFilter,
    useSettingsContext,
} from '../../hooks/useSettings.js';
import { useFilterNodes } from '../../hooks/useFilterNodes.js';
import { useFilterEdges } from '../../hooks/useFilterEdges.js';
import { useFilterConnected } from '../../hooks/useFilterConnected.js';
import Toggle from '../utils/Toggle.jsx';
import SlideToggle from '../utils/SlideToggle.jsx';
import './filtercontrol.css';

function escapeRegex(string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

const FilterControl = () => {
    const cy = useCy();
    const { settings } = useSettingsContext();
    const { setNodeFilter } = useSetNodeFilter();
    const { setEdgeFilter } = useSetEdgeFilter();

    useFilterNodes(cy, settings.nodeFilter);
    useFilterEdges(cy, settings.edgeFilter);
    useFilterConnected(cy, settings.nodeFilter, settings.edgeFilter);

    const debouncedSetNodeFilter = useDebouncedCallback((value) => {
        setNodeFilter({
            filter: value,
            connected: false,
            direction: settings.nodeFilter.direction,
        });
    }, 200);

    return (
        <>
            <div className="filter-control">
                <div className="node-filter-control">
                    <label>
                        Filter:
                        <input
                            type="text"
                            name="filter"
                            placeholder="Filter displayed resources"
                            value={settings.nodeFilter.filter}
                            onChange={(e) => debouncedSetNodeFilter(e.target.value)}
                        />
                    </label>
                </div>
                <Toggle
                    checked={settings.nodeFilter.connected}
                    onChange={() =>
                        setNodeFilter({
                            connected: !settings.nodeFilter.connected,
                            direction: settings.nodeFilter.direction,
                        })
                    }
                >
                    Connected Nodes
                </Toggle>
                {settings.nodeFilter.connected && (
                    <SlideToggle
                        className="connected-toggle"
                        selected={settings.nodeFilter.direction}
                        onChange={(e) =>
                            setNodeFilter({
                                filter: settings.nodeFilter.filter,
                                connected: settings.nodeFilter.connected,
                                direction: e,
                            })
                        }
                        options={[
                            { value: 'both', label: 'Both' },
                            { value: 'inbound', label: 'In' },
                            { value: 'outbound', label: 'Out' },
                        ]}
                    />
                )}
                <div className="edge-filter-control">
                    <Toggle
                        checked={settings.edgeFilter.compile}
                        onChange={() => setEdgeFilter({ compile: !settings.edgeFilter.compile })}
                    >
                        Compile
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.provided}
                        onChange={() => setEdgeFilter({ provided: !settings.edgeFilter.provided })}
                    >
                        Provided
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.test}
                        onChange={() => setEdgeFilter({ test: !settings.edgeFilter.test })}
                    >
                        Test
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.grouping}
                        onChange={() => setEdgeFilter({ grouping: !settings.edgeFilter.grouping })}
                    >
                        Grouping
                    </Toggle>
                </div>
            </div>
        </>
    );
};

export default FilterControl;
