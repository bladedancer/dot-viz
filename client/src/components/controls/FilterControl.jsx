import React, { useEffect } from 'react';
import { useCy } from '../../hooks/useCy.js';
import {
    useSetNodeFilter,
    useSetEdgeFilter,
    useSetSource,
} from '../../hooks/useSettings.js';
import Toggle from '../utils/Toggle.jsx';
import SlideToggle from '../utils/SlideToggle.jsx';
import './filtercontrol.css';

const FilterControl = () => {
    const cy = useCy();
    const { source } = useSetSource();
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
                                // TODO: DIRECTION
                                if (
                                    (linkType == 'extends' && ef.extends) ||
                                    (linkType == 'component' && ef.component) ||
                                    (linkType == 'reference' &&
                                        e.data('isHard') &&
                                        ef.referenceHard) ||
                                    (linkType == 'reference' &&
                                        e.data('isSoft') &&
                                        ef.referenceSoft)
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
                if (linkType == 'extends') {
                    ef.extends ? e.show() : e.hide();
                } else if (linkType == 'component') {
                    ef.component ? e.show() : e.hide();
                } else if (linkType == 'reference') {
                    const isHard = e.data('isHard');
                    isHard && ef.referenceHard ? e.show() : e.hide();
                    !isHard && ef.referenceSoft ? e.show() : e.hide();
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
                    {source() === 'entityTypes' && (
                        <Toggle
                            checked={edgeFilter().extends}
                            onChange={() =>
                                setEdgeFilter({
                                    extends: !edgeFilter().extends,
                                })
                            }
                        >
                            Inheritance
                        </Toggle>
                    )}
                    <Toggle
                        checked={edgeFilter().component}
                        onChange={() =>
                            setEdgeFilter({
                                component: !edgeFilter().component,
                            })
                        }
                    >
                        Component
                    </Toggle>
                    <Toggle
                        checked={edgeFilter().referenceHard}
                        onChange={() =>
                            setEdgeFilter({
                                referenceHard: !edgeFilter().referenceHard,
                            })
                        }
                    >
                        Hard Reference
                    </Toggle>
                    <Toggle
                        checked={edgeFilter().referenceSoft}
                        onChange={() =>
                            setEdgeFilter({
                                referenceSoft: !edgeFilter().referenceSoft,
                            })
                        }
                    >
                        Soft Reference
                    </Toggle>
                </div>
            </div>
        </>
    );
};

export default FilterControl;
