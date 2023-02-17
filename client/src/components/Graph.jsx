import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useSetSelection, useSetContentModifiedTS, useSetGraphData, useSettingsContext } from "../hooks/useSettings.js";
import { useCy } from "../hooks/useCy";

const Graph = ({children}) => {
    const [elements, setElements] = useState([]);
    const { settings } = useSettingsContext();
    const { selection, setSelection } = useSetSelection();
    const { graphData, setGraphData } = useSetGraphData();
    const cy = useCy();
    // const {contentModifiedTS, setContentModifiedTS} = useSetContentModifiedTS();

    // Convert to elements
    useEffect(() => {
        const nodeData = graphData();
        
        let els = [];
        nodeData.nodes.forEach(n => {
            els.push({
                data: {
                    id: n.id,
                    label: n.name,
                    color: n.color,
                    root: !n.extends
                },
                classes: `${n.isRoot ? 'root-node ' : ''}`
            });
        });
        nodeData.nodes.forEach(n => {
            n.links.forEach(l => {
                const targetNode = nodeData.nodes.find(tn => tn.id === l.target);
                if (!targetNode) {
                    console.log("Link not found", l)
                    return; // TODO: Presumably only target
                }
                els.push({
                    data: {
                        id: `${l.linkType}-${l.source}-${l.target}`,
                        source: l.source,
                        target: l.target,
                        sourceColor: n.color,
                        targetColor: targetNode.color,
                        gradient: `${n.color} ${targetNode.color}`,
                        linkType: l.linkType
                    }
                });
            });
        });
        setElements(els);
    }, [settings.graphData]);

    // useLayoutEffect(() => {
    //     setContentModifiedTS(Date.now());
    // }, [elements])

    const cytoscapeStylesheet = [
        {
            selector: "node",
            style: {
                "background-color": "data(color)",
                width: "label",
                height: "label",
                padding: "8px",
                shape: "round-rectangle",
                'min-zoomed-font-size': 8,
            }
        },
        {
            selector: "node.root-node",
            style: {
                "shape": "hexagon"
            }
        },
        {
            selector: ':selected',
            css: {
                'underlay-color': '#00ffff',
                'underlay-padding': '5px',
                'underlay-opacity': '0.5'
            }
        },
        {
            selector: "node[label]",
            style: {
                label: "data(label)",
                "font-size": "12",
                color: "white",
                "text-halign": "center",
                "text-valign": "center"
            }
        },
        {
            selector: "edge",
            style: {
                "curve-style": "bezier",
                "target-arrow-shape": "triangle",
                "target-arrow-color": "data(targetColor)",
                "line-fill": "linear-gradient",
                "line-gradient-stop-colors": "data(gradient)",
                "line-gradient-stop-positions": "50",
                width: 1.5
            }
        },
        {
            selector: "edge[label]",
            style: {
                label: "data(label)",
                "font-size": "12",

                "text-background-color": "white",
                "text-background-opacity": 1,
                "text-background-padding": "2px",

                "text-border-color": "black",
                "text-border-style": "solid",
                "text-border-width": 0.5,
                "text-border-opacity": 1,

                "text-rotation": "autorotate"
            }
        },
        {
            selector: ':parent',
            style: {
              'background-opacity': 0.333,
              'border-color': '#2B65EC'
            }
        }
    ]

    // Have to use a ref here so that it can be updated.
    const setSel = useRef(setSelection)
    useEffect(() => {
        setSel.current = setSelection;
    }, [setSelection])


    useEffect(() => {
        if (!cy) {
            return;
        }
        cy.on("select", () => {
            setSel.current(cy.nodes().filter(":selected"));
        });
        cy.on("unselect", () => {
            setSel.current(cy.nodes().filter(":selected"));
        });
        cy.on("boxselect", () => {
            setSel.current(cy.nodes().filter(":selected"));
        });
    }, [cy])

    return (
        <CytoscapeComponent
            global='cy'
            elements={elements}
            style={{ top: 0, bottom: 0, position: "absolute", width: "100%" }}
            stylesheet={cytoscapeStylesheet}
        />
    );
}

export default Graph;
