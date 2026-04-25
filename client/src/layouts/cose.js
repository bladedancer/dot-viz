const cose = {
    name: 'cose',

    // Whether to animate while running the layout
    // true : Animate continuously as the layout is running
    // false : Just show the end result
    // 'end' : Animate with the end result, from the initial positions to the end positions
    animate: true,

    // The duration of the animation for animate:'end'
    animationDuration: undefined,

    // Extra spacing between components in non-compound graphs
    componentSpacing: 40,

    // Cooling factor (how the temperature is reduced between consecutive iterations
    coolingFactor: 0.99,

    // Divisor to compute edge forces
    edgeElasticity: function (edge) {
        switch (edge.data('linkType')) {
            case 'compile':
                return cose.edgeElasticityCompile || 32;
            case 'provided':
                return cose.edgeElasticityProvided || 32;
            default:
                return 32;
        }
    },

    // Whether to fit the network view after when done
    fit: true,

    // Gravity force (constant)
    gravity: 1,

    // Ideal edge (non nested) length
    idealEdgeLength: function (edge) {
        switch (edge.data('linkType')) {
            case 'compile':
                return cose.idealEdgeLengthCompile || 32;
            case 'provided':
                return cose.idealEdgeLengthProvided || 32;
            default:
                return 32;
        }
    },

    // Initial temperature (maximum node displacement)
    initialTemp: 1000,

    // Lower temperature threshold (below this point the layout will end)
    minTemp: 1.0,

    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 1.2,

    // Excludes the label when calculating node bounding boxes for the layout algorithm
    nodeDimensionsIncludeLabels: true,

    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: function (node) {
        if (node.data('root')) {
            return cose.nodeRepulsionRoot || 2048;
        } else {
            return cose.nodeRepulsionResource || 2048;
        }
    },

    // Node repulsion (overlapping) multiplier
    nodeOverlap: 4,

    // Maximum number of iterations to perform
    numIter: 1000,

    // Padding on fit
    padding: 30,

    // Randomize the initial positions of the nodes (true) or use existing positions (false)
    randomize: false,

    // Number of iterations between consecutive screen positions update
    refresh: 20,

    schema: {
        title: 'cose',
        type: 'object',
        properties: {
            animate: {
                type: 'boolean',
                title: 'Animate',
                default: true,
            },
            animationDuration: {
                type: 'number',
                title: 'Animation Duration',
                default: 10000,
            },
            componentSpacing: {
                type: 'number',
                title: 'Component Spacing',
                default: 40,
            },
            coolingFactor: {
                type: 'number',
                title: 'Cooling Factor',
                default: 0.99,
            },
            edgeElasticityCompile: {
                type: 'number',
                title: 'Edge Elasticity (Compile)',
                default: 32,
            },
            edgeElasticityProvided: {
                type: 'number',
                title: 'Edge Elasticity (Provided)',
                default: 32,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
            },
            gravity: {
                type: 'number',
                title: 'Gravity',
                default: 1,
            },
            idealEdgeLengthCompile: {
                type: 'number',
                title: 'Ideal Edge Length (Compile)',
                default: 32,
            },
            idealEdgeLengthProvided: {
                type: 'number',
                title: 'Ideal Edge Length (Provided)',
                default: 32,
            },
            initialTemp: {
                type: 'number',
                title: 'Initial Temp',
                default: 1000,
            },
            minTemp: {
                type: 'number',
                title: 'Min Temp',
                default: 1,
            },
            nestingFactor: {
                type: 'number',
                title: 'Nesting Factor',
                default: 1.2,
            },
            nodeDimensionsIncludeLabels: {
                type: 'boolean',
                title: 'Node Dimensions Include Labels',
                default: true,
            },
            nodeRepulsionRoot: {
                type: 'number',
                title: 'Node Repulsion (Root)',
                default: 2048,
            },
            nodeRepulsionResource: {
                type: 'number',
                title: 'Node Repulsion (Resource)',
                default: 2048,
            },
            nodeOverlap: {
                type: 'number',
                title: 'Node Overlap',
                default: 4,
            },
            numIter: {
                type: 'number',
                title: 'Number of Iterations',
                default: 1000,
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
                default: 10,
            },
        },
    },
    // https://js.cytoscape.org/#layouts/cose
};

export default cose;
