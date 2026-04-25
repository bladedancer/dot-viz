const coseBilkent = {
    name: 'cose-bilkent',
    // Type of layout animation. The option set is {'during', 'end', false}
    animate: 'during',
    // Duration for animate:end
    animationDuration: 500,
    // Divisor to compute edge forces
    edgeElasticity: 0.45,
    // Whether to fit the network view after when done
    fit: true,
    // Gravity force (constant)
    gravity: 0.25,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 1.5,
    // Gravity force (constant) for compounds
    gravityCompound: 1.0,
    // Gravity range (constant)
    gravityRange: 3.8,
    // Ideal (intra-graph) edge length
    idealEdgeLength: 50,
    // Initial cooling factor for incremental layout
    initialEnergyOnIncremental: 0.5,
    // Nesting factor (multiplier) to compute ideal edge length for inter-graph edges
    nestingFactor: 0.1,
    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: 4500,
    // Whether to include labels in node dimensions. Useful for avoiding label overlap
    nodeDimensionsIncludeLabels: true,
    // Maximum number of iterations to perform
    numIter: 2500,
    // Padding on fit
    padding: 10,
    // 'draft', 'default' or 'proof"
    // - 'draft' fast cooling rate
    // - 'default' moderate cooling rate
    // - "proof" slow cooling rate
    quality: 'default',
    // Whether to enable incremental mode
    randomize: false,
    // number of ticks per frame; higher is faster but more jerky
    refresh: 30,
    // Whether to tile disconnected nodes
    tile: true,
    // Amount of vertical space to put between degree zero nodes during tiling (can also be a function)
    tilingPaddingVertical: 10,
    // Amount of horizontal space to put between degree zero nodes during tiling (can also be a function)
    tilingPaddingHorizontal: 10,

    schema: {
        title: 'cose-bilkent',
        type: 'object',
        properties: {
            animateBool: {
                type: 'string',
                title: 'Animate',
                enum: ['during', 'end'],
                default: 'during',
            },
            animationDuration: {
                type: 'number',
                title: 'Animation Duration',
                default: 500,
            },
            edgeElasticity: {
                type: 'number',
                title: 'Edge Elasticity',
                default: 0.45,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
            },
            gravity: {
                type: 'number',
                title: 'Gravity',
                default: 0.25,
            },
            gravityRange: {
                type: 'number',
                title: 'Gravity Range',
                default: 3.8,
            },
            gravityCompound: {
                type: 'number',
                title: 'Gravity for Compound',
                default: 1,
            },
            gravityRangeCompound: {
                type: 'number',
                title: 'Gravity Range for Compounds',
                default: 1.5,
            },
            idealEdgeLength: {
                type: 'number',
                title: 'Ideal Edge Length',
                default: 50,
            },
            initialEnergyOnIncremental: {
                type: 'number',
                title: 'initial Energy On Incremental',
                default: 0.5,
            },
            nestingFactor: {
                type: 'number',
                title: 'Nesting Factor',
                default: 0.1,
            },
            nodeRepulsion: {
                type: 'number',
                title: 'Node Repulsion',
                default: 4500,
            },
            nodeDimensionsIncludeLabels: {
                type: 'boolean',
                title: 'Node Dimensions Include Labels',
                default: true,
            },
            numIter: {
                type: 'number',
                title: 'Number of Iterations',
                default: 2500,
            },
            padding: {
                type: 'number',
                title: 'Padding',
                default: 30,
            },
            quality: {
                type: 'string',
                title: 'Quality',
                enum: ['draft', 'default', 'proof'],
                default: 'default',
            },
            randomize: {
                type: 'boolean',
                title: 'Randomize',
                default: false,
            },
            refresh: {
                type: 'number',
                title: 'Refresh',
                default: 30,
            },
            tile: {
                type: 'boolean',
                title: 'Tile',
                default: true,
            },
            tilingPaddingHorizontal: {
                type: 'number',
                title: 'Tiling Padding Horizontal',
                default: 10,
            },
            tilingPaddingVertical: {
                type: 'number',
                title: 'Tiling Padding Vertical',
                default: 10,
            },
        },
    },
    //https://github.com/cytoscape/cytoscape.js-cose-bilkent
};

export default coseBilkent;
