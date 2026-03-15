import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useSetSelection, useSettingsContext, useBumpLayoutTrigger } from '../hooks/useSettings.js';
import { useCy } from '../hooks/useCy';
import './graph.css';

const Graph = ({ children }) => {
    const [elements, setElements] = useState([]);
    const { settings } = useSettingsContext();
    const { setSelection } = useSetSelection();
    const { bumpLayoutTrigger } = useBumpLayoutTrigger();
    const cy = useCy();

    // Convert to elements
    useEffect(() => {
        const nodeData = settings.nodeData[settings.source];

        let els = [];
        nodeData.forEach((n) => {
            els.push({
                data: {
                    id: n.id,
                    label: n.name,
                    color: n.color,
                    root: !n.isRoot,
                    group: n.group,
                    depth: n.depth,
                    nodeWidth: Math.max(n.name.length * 7 + 16, 40),
                    nodeHeight: 28,
                },
                classes: `${n.isRoot ? 'root-node ' : ''}`,
            });
        });
        nodeData.forEach((n) => {
            n.links.forEach((l) => {
                const targetNode = nodeData.find((tn) => tn.id === l.target);
                if (!targetNode) {
                    console.error('Link not found', l);
                    return;
                }

                 // HACK hide group links for clumps
                let col = l.linkType === "grouping" ? {
                        source: '#FFFFFF',
                        target: '#FFFFFF'
                    } : {
                        source: n.color,
                        target: targetNode.color
                    };

                els.push({
                    data: {
                        id: `${l.linkType}-${l.source}-${l.target}`,
                        source: l.source,
                        target: l.target,
                        label: l.label,
                        sourceColor: col.source,
                        targetColor: col.target, 
                        gradient: `${col.source} ${col.target}`,
                        linkType: l.linkType,
                        isHard: l.isHard
                    },
                });
            });
        });
        setElements(els);
        bumpLayoutTrigger();
    }, [settings.source, settings.nodeData]);

    const cytoscapeStylesheet = [
        {
            selector: 'node',
            style: {
                'background-color': 'data(color)',
                width: 'data(nodeWidth)',
                height: 'data(nodeHeight)',
                shape: 'round-rectangle',
                'min-zoomed-font-size': 8,
            },
        },
        {
            selector: 'node.root-node',
            style: {
                shape: 'hexagon',
            },
        },
        {
            selector: ':selected',
            css: {
                'underlay-color': '#00ffff',
                'underlay-padding': '5px',
                'underlay-opacity': '0.5',
            },
        },
        {
            selector: 'node[label]',
            style: {
                label: 'data(label)',
                'font-size': '12',
                color: 'white',
                'text-halign': 'center',
                'text-valign': 'center',
            },
        },
        {
            selector: 'edge',
            style: {
                'curve-style': 'bezier',
                'target-arrow-shape': 'triangle',
                'target-arrow-color': 'data(targetColor)',
                'line-fill': 'linear-gradient',
                'line-gradient-stop-colors': 'data(gradient)',
                'line-gradient-stop-positions': '50',
                width: 1.5,
            },
        },
        {
            selector: 'edge[label]',
            style: {
                label: 'data(label)',
                'font-size': '12',

                'text-background-color': 'white',
                'text-background-opacity': 1,
                'text-background-padding': '2px',

                'text-border-color': 'black',
                'text-border-style': 'solid',
                'text-border-width': 0.5,
                'text-border-opacity': 1,

                'text-rotation': 'autorotate',
            },
        },
        {
            selector: ':parent',
            style: {
                'background-opacity': 0.333,
                'border-color': '#2B65EC',
            },
        },
    ];

    // Have to use a ref here so that it can be updated.
    const setSel = useRef(setSelection);
    useEffect(() => {
        setSel.current = setSelection;
    }, [setSelection]);

    useEffect(() => {
        if (!cy) {
            return;
        }
        cy.on('select', () => {
            setSel.current(cy.nodes().filter(':selected'));
        });
        cy.on('unselect', () => {
            setSel.current(cy.nodes().filter(':selected'));
        });
        cy.on('boxselect', () => {
            setSel.current(cy.nodes().filter(':selected'));
        });
    }, [cy]);

    return (
        <div style={{ top: 0, bottom: 0, left: 0, right: 0, position: 'absolute' }}>
            <CytoscapeComponent
                global="cy"
                elements={elements}
                style={{ top: 0, bottom: 0, left: 0, right: 0, position: 'absolute', width: '100%' }}
                stylesheet={cytoscapeStylesheet}
            />
            {settings.loading && (
                <div className="graph-loading-overlay">
                    <div className="graph-loading-spinner" />
                </div>
            )}
        </div>
    );
};

export default Graph;
