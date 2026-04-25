const circle = {
    name: 'circle',
    animate: false, // whether to transition the node positions
    animationDuration: 500, // duration of animation in ms if enabled
    avoidOverlap: true, // prevents node overlap, may overflow boundingBox and radius if not enough space
    clockwise: true, // whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
    fit: true, // whether to fit the viewport to the graph
    nodeDimensionsIncludeLabels: true, // Excludes the label when calculating node bounding boxes for the layout algorithm
    padding: 30, // the padding on fit
    radius: 100, // the radius of the circle
    spacingFactor: 1, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    startAngle: (3 / 2) * Math.PI, // where nodes start in radians
    sweep: 2 * Math.PI, // how many radians should be between the first and last node (defaults to full circle)
    schema: {
        title: 'circle',
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
            padding: {
                type: 'number',
                title: 'Padding',
                default: 30,
            },
            radius: {
                type: 'number',
                title: 'Radius',
            },
            spacingFactor: {
                type: 'number',
                title: 'Spacing Factor',
                default: 1.75,
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
    //https://js.cytoscape.org/#layouts/circle
};

export default circle;
