const breadthfirst = {
    name: 'breadthfirst',
    fit: true,
    directed: false,
    padding: 30,
    circle: true,
    grid: false,
    spacingFactor: 1.75,
    avoidOverlap: true,
    maximal: false,
    nodeDimensionsIncludeLabels: true,
    spacingFactor: 1,
    animate: false,
    animationDuration: 500,
    schema: {
        title: 'breadthfirst',
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
            circle: {
                type: 'boolean',
                title: 'Circle',
                default: true,
            },
            directed: {
                type: 'boolean',
                title: 'Directed',
                default: false,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
            },
            grid: {
                type: 'boolean',
                title: 'Grid',
                default: true,
            },
            maximal: {
                type: 'boolean',
                title: 'Maximal',
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
            spacingFactor: {
                type: 'number',
                title: 'Spacing Factor',
                default: 1.75,
            },
        },
    },
    //https://js.cytoscape.org/#layouts/breadthfirst
};

export default breadthfirst;
