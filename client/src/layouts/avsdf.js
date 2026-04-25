const avsdf = {
    name: 'avsdf',
    refresh: 30,
    fit: true,
    padding: 10,
    ungrabifyWhileSimulating: false,
    animate: 'end',
    animationDuration: 500,
    nodeSeparation: 60,
    schema: {
        title: 'avsdf',
        type: 'object',
        properties: {
            animate: {
                type: 'string',
                title: 'Animate',
                default: 'end',
                enum: ['during', 'end'],
                description: 'Type of layout animation',
            },
            animationDuration: {
                type: 'number',
                title: 'Animation Duration',
                default: 500,
                description: 'Duration for animate:end',
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
                description:
                    'Whether to fit the network view after when done',
            },
            nodeSeparation: {
                type: 'number',
                title: 'Node Separation',
                default: 60,
            },
            padding: {
                type: 'number',
                title: 'Padding',
                default: 10,
                description: 'Padding on fit',
            },
            refresh: {
                type: 'number',
                title: 'Refresh',
                description:
                    'Number of ticks per frame; higher is faster but more jerky',
                default: 10,
            },
            ungrabifyWhileSimulating: {
                type: 'boolean',
                title: 'Ungrabify While Simulating',
                default: false,
                description:
                    'Prevent the user grabbing nodes during the layout',
            },
        },
    },
    //https://github.com/iVis-at-Bilkent/cytoscape.js-avsdf
};

export default avsdf;
