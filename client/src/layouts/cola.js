const cola = {
    name: 'cola',
    edgeLength: (e) => {
        let length =
            e.source().data('group') === e.target().data('group')
                ? cola.edgeLengthInGroup || 300
                : cola.edgeLengthCrossGroup || 400;
        return length;
    },
    flow: false,
    animate: true, // whether to show the layout as it's running
    infinite: true,
    refresh: 1, // number of ticks per frame; higher is faster but more jerky
    maxSimulationTime: 4000, // max length in ms to run the layout
    ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
    edgeLengthInGroup: 300,
    edgeLengthCrossGroup: 400,
    fit: false, // on every layout reposition of nodes, fit the viewport
    padding: 30, // padding around the simulation
    nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
    randomize: false, // use random node positions at beginning of layout
    avoidOverlap: false, // if true, prevents overlap of node bounding boxes
    handleDisconnected: true, // if true, avoids disconnected components from overlapping
    convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
    centerGraph: false, // adjusts the node positions initially to center the graph (pass false if you want to start the layout from the current position)

    schema: {
        title: 'cola',
        type: 'object',
        properties: {
            animate: {
                type: 'boolean',
                title: 'Animate',
                default: false,
            },
            avoidOverlap: {
                type: 'boolean',
                title: 'Avoid Overlap',
                default: false,
            },
            centerGraph: {
                type: 'boolean',
                title: 'Center Graph',
                default: false,
            },
            convergenceThreshold: {
                type: 'number',
                title: 'Convergence Threshold',
                default: 0.01,
            },
            edgeLengthCrossGroup: {
                type: 'number',
                title: 'Edge Length Cross Group',
                default: 300,
            },
            edgeLengthInGroup: {
                type: 'number',
                title: 'Edge Length In Group',
                default: 100,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: false,
            },
            handleDisconnected: {
                type: 'boolean',
                title: 'Handle Disconnected',
                default: true,
            },
            flow: {
                type: 'object',
                title: 'Flow (use default)',
                default: false,
            },
            infinite: {
                type: 'boolean',
                title: 'Infinite',
                default: true,
            },
            maxSimulationTime: {
                type: 'number',
                title: 'Max Simulation Time',
                default: 4000,
            },
            nodeDimensionsIncludeLabels: {
                type: 'boolean',
                title: 'Node Dimensions Include Labels',
                default: true,
            },
            padding: {
                type: 'number',
                title: 'Padding',
                default: 30,
            },
            randomize: {
                type: 'boolean',
                title: 'Randomize',
                default: false,
            },
            refresh: {
                type: 'number',
                title: 'Refresh',
                default: 1,
            },
            ungrabifyWhileSimulating: {
                type: 'boolean',
                title: 'Ungrabify While Simulating',
                default: false,
            },
        },
    },
    //https://github.com/cytoscape/cytoscape.js-cola
};

export default cola;
