import React, { useEffect } from 'react';
import { useCy } from '../../hooks/useCy.js';
import {
    useSetNodeFilter,
    useSetEdgeFilter,
    useSetSource,
    useSettingsContext,
} from '../../hooks/useSettings.js';
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

    useEffect(async () => {
        if (!cy) {
            return;
        }
        cy.batch(() => {
            let nf = settings.nodeFilter;
            let ef = settings.edgeFilter;

            cy.nodes().forEach((n) => {
                // Ids take precedence
                try {
                    if (nf.ids && nf.ids.length && !nf.ids.includes(n.id())) {
                        n.hide();
                    } else if (
                        !nf.filter ||
                        n
                            .data('label')
                            .toLowerCase()
                            .match(nf.filter.toLowerCase() + '.*')
                    ) {
                        n.show();
                    } else {
                        n.hide();
                    }
                } catch (err) {
                    console.error(err);
                    n.hide();
                }
            });

            if ((nf.filter || nf.ids) && nf.connected) {
                cy.nodes(':visible').forEach((root) => {
                    let nodes = cy.collection();
                    if (
                        !nf.direction ||
                        nf.direction === 'both' ||
                        nf.direction === 'inbound'
                    ) {
                        nodes.merge(root.predecessors());
                    }
                    if (
                        !nf.direction ||
                        nf.direction === 'both' ||
                        nf.direction === 'outbound'
                    ) {
                        nodes.merge(root.successors());
                    }
                    nodes.merge(root);

                    nodes.forEach((goal) => {
                        let path = nodes.aStar({
                            root,
                            goal,
                            weight: (e) => {
                                let linkType = e.data('linkType');
                                if (
                                    (linkType == 'compile' && ef.compile) ||
                                    (linkType == 'provided' && ef.provided) ||
                                    (linkType == 'grouping' && ef.grouping) ||
                                    (linkType == 'test' && ef.test)
                                ) {
                                    // Along an enabled edge
                                    return 1;
                                } else {
                                    return 10000000;
                                }
                            },
                        });

                        if (path.distance && path.distance < 10000000) {
                            goal.show();
                        }
                    });
                });
            }

            cy.edges().forEach((e) => {
                let linkType = e.data('linkType');
                if (linkType == 'compile') {
                    ef.compile ? e.show() : e.hide();
                } else if (linkType == 'provided') {
                    ef.provided ? e.show() : e.hide();
                } else if (linkType == 'grouping') {
                    ef.grouping ? e.show() : e.hide();
                } else if (linkType == 'test') {
                    ef.test ? e.show() : e.hide();
                }
            });
        });
    }, [cy, settings.nodeFilter, settings.edgeFilter]);

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
                            onChange={(e) =>
                                setNodeFilter({
                                    filter: e.target.value,
                                    connected: false,
                                    direction: settings.nodeFilter.direction,
                                })
                            } // Need to debounce this
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
                            {
                                value: 'both',
                                label: 'Both',
                            },
                            {
                                value: 'inbound',
                                label: 'In',
                            },
                            {
                                value: 'outbound',
                                label: 'Out',
                            },
                        ]}
                    />
                )}
                <div className="edge-filter-control">
                    <Toggle
                        checked={settings.edgeFilter.compile}
                        onChange={() =>
                            setEdgeFilter({
                                compile: !settings.edgeFilter.compile,
                            })
                        }
                    >
                        Compile
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.provided}
                        onChange={() =>
                            setEdgeFilter({
                                provided: !settings.edgeFilter.provided,
                            })
                        }
                    >
                        Provided
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.test}
                        onChange={() =>
                            setEdgeFilter({
                                test: !settings.edgeFilter.test,
                            })
                        }
                    >
                        Test
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.grouping}
                        onChange={() =>
                            setEdgeFilter({
                                grouping: !settings.edgeFilter.grouping,
                            })
                        }
                    >
                        Grouping
                    </Toggle>
                </div>
            </div>
        </>
    );
};

export default FilterControl;
