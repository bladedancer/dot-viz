import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useSetSelection, useSetContentModifiedTS } from "../hooks/useSettings.js";
import { useCy } from "../hooks/useCy";

const Graph = ({nodeData, children}) => {
    const [elements, setElements] = useState([]);
    const { selection, setSelection } = useSetSelection();
    const cy = useCy();
    const {contentModifiedTS, setContentModifiedTS} = useSetContentModifiedTS();

    // Convert to elements
    useEffect(() => {
        let els = [];
        nodeData.nodes.forEach(n => {
            els.push({
                data: {
                    id: n.id,
                    label: n.name ? `${n.name} (${n.kind})` : n.kind,
                    color: n.color,
                    linkType: n.refType,
                    root: n.isScope,
                    kind: n.kind,
                    apigroup: n.group,
                    groupIndex: nodeData.scopes.findIndex(s => s.id === (n.isScope ? n.id : n.scope.id)),
                    groupId: nodeData.scopes.find(s => s.id === (n.isScope ? n.id : n.scope.id)).id,
                },
                classes: `${n.hasFinalizer ? 'hasFinalizer ' : ''}${n.isScope ? 'scope ' : ''}`
            });
        });
        nodeData.nodes.forEach(n => {
            n.links.forEach(l => {
                const targetNode = nodeData.nodes.find(tn => tn.id === l.target);
                els.push({
                    data: {
                        id: l.source + '-' + l.target,
                        source: l.source,
                        target: l.target,
                        sourceColor: n.color,
                        targetColor: targetNode.color,
                        gradient: `${n.color} ${targetNode.color}`,
                        type: l.refType
                    }
                })
            });
        });
        setElements(els);
    }, [nodeData]);

    useLayoutEffect(() => {
        setContentModifiedTS(Date.now());
    }, [elements])

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
            selector: "node.scope",
            style: {
                "shape": "hexagon"
            }
        },
        {
            selector: "node.hasFinalizer",
            style: {
                'background-image': 'data:image/svg+xml;utf8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%3Csvg%20width%3D%2263.5%22%20height%3D%2289.445656%22%20version%3D%221.1%22%20id%3D%22svg5%22%20xml%3Aspace%3D%22preserve%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Asvg%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%20id%3D%22defs2%22%20%2F%3E%3Cg%20id%3D%22layer1%22%20transform%3D%22translate(-45.331587%2C-121.7022)%22%3E%3Cpath%20style%3D%22fill%3A%23000000%3Bstroke-width%3A0.264583%22%20d%3D%22m%2066.338926%2C203.47924%20c%20-5.514922%2C-4.21774%20-11.020205%2C-8.58333%20-12.233962%2C-9.70131%20-3.326883%2C-3.06435%20-5.660024%2C-6.63081%20-7.269737%2C-11.11257%20-1.499839%2C-4.17586%20-1.50364%2C-4.24929%20-1.50364%2C-29.04748%20v%20-22.81111%20l%200.595313%2C-0.54801%20c%200.546941%2C-0.50348%201.003775%2C-0.55833%205.622395%2C-0.67501%203.997904%2C-0.10101%205.460421%2C-0.24256%207.14375%2C-0.69143%202.458365%2C-0.65553%205.8034%2C-2.19564%207.991932%2C-3.6796%206.910707%2C-4.68591%2013.890357%2C-4.68067%2020.816207%2C0.0156%202.12804%2C1.44297%205.55097%2C3.01035%208.02615%2C3.67522%201.62608%2C0.43678%203.11734%2C0.57991%207.086536%2C0.68019%204.61862%2C0.11669%205.07546%2C0.17153%205.6224%2C0.67502%20l%200.59531%2C0.54801%20v%2022.67338%20c%200%2C24.6314%20-0.0218%2C25.05964%20-1.48556%2C29.1356%20-1.52836%2C4.25595%20-3.71182%2C7.70968%20-6.77253%2C10.7126%20-1.060596%2C1.04057%20-6.612396%2C5.47564%20-12.337326%2C9.85573%20-7.8502%2C6.00611%20-10.58854%2C7.96378%20-11.13953%2C7.96378%20-0.55027%2C0%20-3.20526%2C-1.89261%20-10.757708%2C-7.66862%20z%20m%2020.532248%2C-4.25166%20c%205.31151%2C-4.07803%2010.29123%2C-8.03512%2011.06605%2C-8.79352%201.89127%2C-1.8512%204.126446%2C-5.25137%205.208156%2C-7.92269%201.73561%2C-4.28618%201.71745%2C-3.995%201.71745%2C-27.53931%20v%20-21.2731%20l%20-3.63802%2C-0.14463%20c%20-6.580306%2C-0.26161%20-10.457986%2C-1.50592%20-16.168876%2C-5.18845%20-3.36482%2C-2.16972%20-4.54374%2C-2.54614%20-7.97435%2C-2.54614%20-3.4306%2C0%20-4.609526%2C0.37642%20-7.974346%2C2.54614%20-5.710891%2C3.68253%20-9.588569%2C4.92684%20-16.16888%2C5.18845%20l%20-3.638021%2C0.14463%20v%2021.2731%20c%200%2C23.38764%20-0.01545%2C23.12932%201.640469%2C27.42931%200.967057%2C2.5112%203.365294%2C6.15481%205.285076%2C8.02956%201.25059%2C1.22126%2020.523782%2C16.19926%2020.855702%2C16.20784%200.0728%2C0.002%204.47807%2C-3.33316%209.78959%2C-7.41119%20z%20M%2061.735753%2C184.68953%20c%20-0.514482%2C-0.51449%20-0.529166%2C-0.88195%20-0.529166%2C-13.2412%20v%20-12.71202%20l%200.649433%2C-0.64943%20c%200.517898%2C-0.5179%200.919805%2C-0.64944%201.984374%2C-0.64944%20h%201.334942%20v%20-3.64857%20c%200%2C-2.4244%200.136081%2C-4.17104%200.405583%2C-5.20572%201.397759%2C-5.36636%205.930079%2C-8.87279%2011.468745%2C-8.87279%203.51821%2C0%206.26705%2C1.14753%208.61249%2C3.59537%202.51933%2C2.62932%203.32568%2C5.17107%203.32568%2C10.48314%20v%203.64857%20h%201.33494%20c%201.06457%2C0%201.46648%2C0.13154%201.98438%2C0.64944%20l%200.64943%2C0.64943%20v%2012.66213%20c%200%2C12.37706%20-0.0121%2C12.67518%20-0.53947%2C13.2412%20l%20-0.53948%2C0.57905%20h%20-14.80636%20c%20-14.453577%2C0%20-14.818962%2C-0.0126%20-15.335521%2C-0.52916%20z%20m%2027.252081%2C-13.36146%20v%20-9.92188%20H%2077.081584%2065.175336%20v%209.92188%209.92187%20h%2011.906248%2011.90625%20z%20m%20-13.06119%2C3.55267%20c%20-0.67715%2C-0.53264%20-0.69714%2C-0.6313%20-0.69714%2C-3.43958%200%2C-3.25528%200.32557%2C-3.94955%201.85208%2C-3.94955%201.52652%2C0%201.85209%2C0.69427%201.85209%2C3.94955%200%2C2.80828%20-0.02%2C2.90694%20-0.69714%2C3.43958%20-0.38343%2C0.3016%20-0.90315%2C0.54837%20-1.15495%2C0.54837%20-0.25179%2C0%20-0.77152%2C-0.24677%20-1.15494%2C-0.54837%20z%20m%209.09244%2C-20.96715%20c%200%2C-4.48246%20-0.34483%2C-5.7319%20-2.11715%2C-7.6711%20-1.69101%2C-1.85023%20-3.38541%2C-2.61007%20-5.82035%2C-2.61007%20-2.43493%2C0%20-4.129334%2C0.75984%20-5.820347%2C2.61007%20-1.772319%2C1.9392%20-2.117151%2C3.18864%20-2.117151%2C7.6711%20v%203.52385%20h%207.937498%207.9375%20z%22%20id%3D%22path179%22%20%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
                'background-height': '20px',
                'background-width': '15px',
                'background-clip': 'none',
                'background-image-containment': 'over',
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
