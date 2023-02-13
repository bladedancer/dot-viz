import React, { useEffect } from 'react';
import { useCy } from '../../hooks/useCy.js';
import { useSetNodeFilter, useSetEdgeFilter } from '../../hooks/useSettings.js';
import Toggle from '../utils/Toggle.jsx';
import SlideToggle from '../utils/SlideToggle.jsx';
import './filtercontrol.css';

const FilterControl = () => {
    const cy = useCy();
    const { nodeFilter, setNodeFilter } = useSetNodeFilter();
    const { edgeFilter, setEdgeFilter } = useSetEdgeFilter();

    useEffect(async () => {
        if (!cy) {
            return;
        }
        cy.batch(() => {
            let nf = nodeFilter();
            let ef = edgeFilter();

            cy.nodes().forEach((n) => {
                // Ids take precedence
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
            });

            if ((nf.filter || nf.ids) && nf.connected) {
                cy.nodes(':visible').forEach((root) => {
                    let nodes = cy.collection();
                    console.log(nf);
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
                                let type = e.data('type');
                                // TODO: DIRECTION
                                if (
                                    (type == 'scope' && ef.scope) ||
                                    (type == 'hard' && ef.hard) ||
                                    (type == 'soft' && ef.soft)
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
                let type = e.data('type');
                if (type == 'scope') {
                    ef.scope ? e.show() : e.hide();
                } else if (type == 'hard') {
                    ef.hard ? e.show() : e.hide();
                } else if (type == 'soft') {
                    ef.soft ? e.show() : e.hide();
                }
            });
        });
    }, [cy, nodeFilter(), edgeFilter()]);

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
                            value={nodeFilter().filter}
                            onChange={(e) =>
                                setNodeFilter({
                                    filter: e.target.value,
                                    connected: false,
                                    direction: nodeFilter().direction,
                                })
                            } // Need to debounce this
                        />
                    </label>
                </div>
                <Toggle
                    checked={nodeFilter().connected}
                    onChange={() =>
                        setNodeFilter({
                            connected: !nodeFilter().connected,
                            direction: nodeFilter().direction,
                        })
                    }
                >
                    Connected Nodes
                </Toggle>
                {nodeFilter().connected && (
                    <SlideToggle
                        className="connected-toggle"
                        selected={nodeFilter().direction}
                        onChange={(e) =>
                            setNodeFilter({
                                filter: nodeFilter().filter,
                                connected: nodeFilter().connected,
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
                        checked={edgeFilter().scope}
                        onChange={() =>
                            setEdgeFilter({ scope: !edgeFilter().scope })
                        }
                    >
                        Scope
                    </Toggle>
                    <Toggle
                        checked={edgeFilter().hard}
                        onChange={() =>
                            setEdgeFilter({ hard: !edgeFilter().hard })
                        }
                    >
                        Hard
                    </Toggle>
                    <Toggle
                        checked={edgeFilter().soft}
                        onChange={() =>
                            setEdgeFilter({ soft: !edgeFilter().soft })
                        }
                    >
                        Soft
                    </Toggle>
                </div>
            </div>
        </>
    );
};

export default FilterControl;
