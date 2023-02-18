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
                if (nf.ids && nf.ids.length && !nf.ids.includes(n.id())) {
                    n.hide();
                } else if (
                    !nf.filter ||
                    n
                        .data('label')
                        .toLowerCase()
                        .match(escapeRegex(nf.filter.toLowerCase()) + '.*')
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
                                if (
                                    (linkType == 'extends' && ef.extends) ||
                                    (linkType == 'component' && ef.component) ||
                                    (linkType == 'reference' &&
                                        e.data('isHard') &&
                                        ef.referenceHard) ||
                                    (linkType == 'reference' &&
                                        !e.data('isHard') &&
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
                    if (isHard) {
                        ef.referenceHard ? e.show() : e.hide();
                    } else {
                        ef.referenceSoft ? e.show() : e.hide();
                    }
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
                    {settings.source === 'entityTypes' && (
                        <Toggle
                            checked={settings.edgeFilter.extends}
                            onChange={() =>
                                setEdgeFilter({
                                    extends: !settings.edgeFilter.extends,
                                })
                            }
                        >
                            Inheritance
                        </Toggle>
                    )}
                    <Toggle
                        checked={settings.edgeFilter.component}
                        onChange={() =>
                            setEdgeFilter({
                                component: !settings.edgeFilter.component,
                            })
                        }
                    >
                        Component
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.referenceHard}
                        onChange={() =>
                            setEdgeFilter({
                                referenceHard: !settings.edgeFilter.referenceHard,
                            })
                        }
                    >
                        Hard Reference
                    </Toggle>
                    <Toggle
                        checked={settings.edgeFilter.referenceSoft}
                        onChange={() =>
                            setEdgeFilter({
                                referenceSoft: !settings.edgeFilter.referenceSoft,
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
