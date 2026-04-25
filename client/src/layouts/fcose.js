const fcose = {
    name: 'fcose',

    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: (n) =>
        n.data('root')
            ? fcose.nodeRepulsionRoot || 4500
            : fcose.nodeRepulsionChild || 6500,

    // Ideal edge (non nested) length
    idealEdgeLength: function (edge) {
        switch (edge.data('linkType')) {
            case 'compile':
                return fcose.idealEdgeLengthCompile || 50;
            case 'provided':
                return (
                    fcose.idealEdgeLengthProvided || 50
                );
            default:
                return 50;
        }
    },
    // Divisor to compute edge forces
    edgeElasticity: function (edge) {
        switch (edge.data('linkType')) {
            case 'compile':
                return fcose.edgeElasticityCompile || 0.45;
            case 'provided':
                return (
                    fcose.edgeElasticityProvided || 0.45
                );
            default:
                return 0.45;
        }
    },

    // 'draft', 'default' or 'proof'
    // - "draft" only applies spectral layout
    // - "default" improves the quality with incremental layout (fast cooling rate)
    // - "proof" improves the quality with incremental layout (slow cooling rate)
    quality: 'default',

    // Use random node positions at beginning of layout
    // if this is set to false, then quality option must be "proof"
    randomize: true,

    // Whether or not to animate the layout
    animate: true,
    // Duration of animation in ms, if enabled
    animationDuration: 1000,
    // Easing of animation, if enabled
    animationEasing: undefined,
    // Fit the viewport to the repositioned nodes
    fit: true,
    // Padding around layout
    padding: 30,
    // Whether to include labels in node dimensions. Valid in "proof" quality
    nodeDimensionsIncludeLabels: false,
    // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
    uniformNodeDimensions: false,
    // Whether to pack disconnected components - cytoscape-layout-utilities extension should be registered and initialized
    packComponents: true,

    /* spectral layout options */

    // False for random, true for greedy sampling
    samplingType: true,
    // Sample size to construct distance matrix
    sampleSize: 25,
    // Separation amount between nodes
    nodeSeparation: 75,
    // Power iteration tolerance
    piTol: 0.0000001,

    /* incremental layout options */

    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 0.1,
    // Maximum number of iterations to perform - this is a suggested value and might be adjusted by the algorithm as required
    numIter: 2500,
    // For enabling tiling
    tile: true,
    // The comparison function to be used while sorting nodes during tiling operation.
    // Takes the ids of 2 nodes that will be compared as a parameter and the default tiling operation is performed when this option is not set.
    // It works similar to ``compareFunction`` parameter of ``Array.prototype.sort()``
    // If node1 is less then node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return a negative value
    // If node1 is greater then node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return a positive value
    // If node1 is equal to node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return 0
    tilingCompareBy: (n1, n2) => {
        switch (fcose.tilingCompareByFn) {
            case 'label':
                return n1.data('label').compare(n2.data('label'));
            case 'depth':
                return n1.data('depth') - n2.data('depth');
            case 'group':
            default:
                return n1.data('group').compare(n2.data('group'));
        }
    },
    // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingVertical: 10,
    // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingHorizontal: 10,
    // Gravity force (constant)
    gravity: 0.25,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 1.5,
    // Gravity force (constant) for compounds
    gravityCompound: 1.0,
    // Gravity range (constant)
    gravityRange: 3.8,
    // Initial cooling factor for incremental layout
    initialEnergyOnIncremental: 0.3,

    /* constraint options */

    // Fix desired nodes to predefined positions
    // [{nodeId: 'n1', position: {x: 100, y: 200}}, {...}]
    fixedNodeConstraint: undefined,
    // Align desired nodes in vertical/horizontal direction
    // {vertical: [['n1', 'n2'], [...]], horizontal: [['n2', 'n4'], [...]]}
    alignmentConstraint: undefined,
    // Place two nodes relatively in vertical/horizontal direction
    // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}, {...}]
    relativePlacementConstraint: undefined,

    schema: {
        title: 'euler',
        type: 'object',
        properties: {
            animate: {
                type: 'boolean',
                title: 'Animate',
                default: 'true',
            },
            animationDuration: {
                type: 'number',
                title: 'Animation Duration',
                default: 1000,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
            },
            nodeDimensionsIncludeLabels: {
                type: 'boolean',
                title: 'Node Dimensions Include Labels',
                default: true,
            },
            packComponents: {
                type: 'boolean',
                title: 'Pack Components',
                default: true,
            },
            padding: {
                type: 'number',
                title: 'Padding',
                default: 30,
            },
            quality: {
                type: 'string',
                enum: ['draft', 'default', 'proof'],
                default: 'default',
            },
            randomize: {
                type: 'boolean',
                title: 'Randomize',
                description: 'If false then quality must be proof.',
                default: 'true',
            },
            uniformNodeDimensions: {
                type: 'boolean',
                title: 'Uniform Dimensions',
                default: 'true',
            },

            // Spectral
            samplingType: {
                type: 'boolean',
                title: 'Spectral Greedy Sampling',
                default: 'true',
            },
            sampleSize: {
                type: 'number',
                title: 'Spectral Sample Size',
                default: 25,
            },
            nodeSeparation: {
                type: 'number',
                title: 'Spectral Node Separation',
                default: 75,
            },

            // Incremental
            nodeRepulsionRoot: {
                type: 'number',
                title: 'Node Repulsion (Root)',
                default: 4500,
            },
            nodeRepulsionChild: {
                type: 'number',
                title: 'Node Repulsion (Child)',
                default: 6500,
            },

            edgeElasticityCompile: {
                type: 'number',
                title: 'Edge Elasticity (Compile)',
                default: 0.45,
            },
            edgeElasticityProvided: {
                type: 'number',
                title: 'Edge Elasticity (Provided)',
                default: 0.45,
            },
            idealEdgeLengthCompile: {
                type: 'number',
                title: 'Ideal Edge Length (Compile)',
                default: 50,
            },
            idealEdgeLengthProvided: {
                type: 'number',
                title: 'Ideal Edge Length (Provided)',
                default: 50,
            },

            nestingFactor: {
                type: 'number',
                title: 'Incremental Nesting Factor',
                default: 0.1,
            },
            numIter: {
                type: 'number',
                title: 'Incremental Number of Iterations',
                default: 2500,
            },

            tile: {
                type: 'boolean',
                title: 'Tile',
                default: 'true',
            },

            tilingCompareByFn: {
                type: 'string',
                title: 'Tiling Compare By',
                enum: ['group', 'depth', 'label'],
                default: ['group']
            },

            tilingPaddingVertical: {
                type: 'number',
                title: 'Tiling Padding Vertical',
                default: 10,
            },
            tilingPaddingHorizontal: {
                type: 'number',
                title: 'Tiling Padding Horizontal',
                default: 10,
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
                title: 'Gravity Compound',
                default: 1,
            },
            gravityRangeCompound: {
                type: 'number',
                title: 'Gravity Range Compound',
                default: 1.5,
            },
            initialEnergyOnIncremental: {
                type: 'number',
                title: 'Initial Energy On Incremental',
                default: 0.3,
            },
        },
    },

    //https://github.com/iVis-at-Bilkent/cytoscape.js-fcose
};

export default fcose;
