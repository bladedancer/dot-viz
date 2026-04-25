import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useSetSelection, useSettingsContext } from '../hooks/useSettings.js';

const cytoscapeStylesheet = [
    {
        selector: 'node',
        style: {
            'background-color': 'data(color)',
            width: 'label',
            height: 'label',
            padding: '8px',
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

const Graph = ({ onCyInit }) => {
    const [elements, setElements] = useState([]);
    const { settings } = useSettingsContext();
    const { setSelection } = useSetSelection();
    const cyRef = useRef(null);

    useEffect(() => {
        const nodeData = settings.nodeData[settings.source];
        const nodeById = new Map(nodeData.map((n) => [n.id, n]));

        const els = [];
        nodeData.forEach((n) => {
            els.push({
                data: {
                    id: n.id,
                    label: n.name,
                    color: n.color,
                    root: n.isRoot,
                    group: n.group,
                    depth: n.depth,
                },
                classes: n.isRoot ? 'root-node' : '',
            });

            n.links.forEach((l) => {
                const targetNode = nodeById.get(l.target);
                if (!targetNode) {
                    console.error('Link not found', l);
                    return;
                }

                // grouping edges are white so layout uses them for clustering without visual clutter
                const col = l.linkType === 'grouping'
                    ? { source: '#FFFFFF', target: '#FFFFFF' }
                    : { source: n.color, target: targetNode.color };

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
                        isHard: l.isHard,
                    },
                });
            });
        });
        setElements(els);
    }, [settings.source, settings.nodeData]);

    return (
        <CytoscapeComponent
            cy={(instance) => {
                if (cyRef.current !== instance) {
                    cyRef.current = instance;
                    instance.on('select', () => {
                        setSelection(instance.nodes().filter(':selected'));
                    });
                    instance.on('unselect', () => {
                        setSelection(instance.nodes().filter(':selected'));
                    });
                    instance.on('boxselect', () => {
                        setSelection(instance.nodes().filter(':selected'));
                    });
                    if (onCyInit) onCyInit(instance);
                }
            }}
            elements={elements}
            style={{ top: 0, bottom: 0, position: 'absolute', width: '100%' }}
            stylesheet={cytoscapeStylesheet}
        />
    );
};

export default Graph;
