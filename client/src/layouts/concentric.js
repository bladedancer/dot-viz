const concentric = {
    name: 'concentric',

    animate: false, // whether to transition the node positions
    animationDuration: 500, // duration of animation in ms if enabled
    avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
    clockwise: true, // whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
    concentric: (n) => {
        let con = 1;
        switch (concentric.concentricAlgo) {
            case 'indegree':
                con = n.indegree() + 1;
                break;
            case 'outdegree':
                con = n.outdegree() + 1;
                break;
            case 'fixedScope':
                con = n.data('root') ? 20 : n.degree() + 1;
                break;
            default:
                con = n.degree() + 1;
        }
        return con;
    },
    equidistant: false, // whether levels have an equal radial distance betwen them, may cause bounding box overflow
    fit: true, // whether to fit the viewport to the graph
    levelWidth: (n) => concentric.levelWidthValue || 2,
    minNodeSpacing: 10, // min spacing between outside of nodes (used for radius adjustment)
    nodeDimensionsIncludeLabels: true, // Excludes the label when calculating node bounding boxes for the layout algorithm
    padding: 30, // the padding on fit
    startAngle: (3 / 2) * Math.PI, // where nodes start in radians
    spacingFactor: 1, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    sweep: 2 * Math.PI, // how many radians should be between the first and last node (defaults to full circle)
    schema: {
        title: 'concentric',
        type: 'object',
        properties: {
            animate: {
                type: 'boolean',
                title: 'Animate',
                default: false,
            },
            animationDuration: {
                type: 'number',
                title: 'Animation Duration',
                default: 500,
            },
            avoidOverlap: {
                type: 'boolean',
                title: 'Avoid Overlap',
                default: true,
            },
            clockwise: {
                type: 'boolean',
                title: 'Clockwise',
                default: true,
            },
            concentricAlgo: {
                type: 'string',
                title: 'Concentric',
                enum: ['degree', 'indegree', 'outdegree', 'fixedScope'],
                default: 'degree',
            },
            equidistant: {
                type: 'boolean',
                title: 'Equidistant',
                default: false,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
            },
            levelWidthValue: {
                type: 'number',
                title: 'Level Width',
                default: 2,
            },
            minNodeSpacing: {
                type: 'number',
                title: 'Min Node Spacing',
                default: 10,
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
            spacingFactor: {
                type: 'number',
                title: 'Spacing Factor',
                default: 1,
            },
            startAngle: {
                type: 'number',
                title: 'Start Angle',
                default: (3 / 2) * Math.PI,
            },
            sweep: {
                type: 'number',
                title: 'Sweep',
                default: 2 * Math.PI,
            },
        },
    },
    // https://js.cytoscape.org/#layouts/concentric
};

export default concentric;
