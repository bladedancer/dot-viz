const euler = {
    name: 'euler',

    // Whether to animate the layout
    // - true : Animate while the layout is running
    // - false : Just show the end result
    // - 'end' : Animate directly to the end result
    animate: true,

    // Animation duration used for animate:'end'
    animationDuration: undefined,

    // Friction / drag coefficient to make the system stabilise over time
    dragCoeff: 0.02,

    // Whether to fit the viewport to the repositioned graph
    // true : Fits at end of layout for animate:false or animate:'end'; fits on each frame for animate:true
    fit: true,

    // Coulomb's law coefficient
    // - Makes the nodes repel each other for negative values
    // - Makes the nodes attract each other for positive values
    gravity: -1.2,

    // The mass of the node in the physics simulation
    // - The mass affects the gravity node repulsion/attraction
    mass: (node) => {
        if (node.data('root')) {
            return euler.massRoot || 40;
        } else {
            const depth = node.data('depth');

            return (euler.massChild * (1/(depth || 1))) || 4;
        }
    },

    // Maximum iterations and time (in ms) before the layout will bail out
    // - A large value may allow for a better result
    // - A small value may make the layout end prematurely
    // - The layout may stop before this if it has settled
    maxIterations: 1000,
    maxSimulationTime: 4000,

    // When the total of the squared position deltas is less than this value, the simulation ends
    movementThreshold: 1,

    // Padding in rendered co-ordinates around the layout
    padding: 30,

    // A force that pulls nodes towards the origin (0, 0)
    // Higher values keep the components less spread out
    pull: 0.001,

    // Whether to randomize the initial positions of the nodes
    // true : Use random positions within the bounding box
    // false : Use the current node positions as the initial positions
    randomize: false,

    // The number of ticks per frame for animate:true
    // - A larger value reduces rendering cost but can be jerky
    // - A smaller value increases rendering cost but is smoother
    refresh: 10,

    // The ideal length of a spring
    // - This acts as a hint for the edge length
    // - The edge length can be longer or shorter if the forces are set to extreme values
    springLength: (edge) => {
        switch (edge.data('linkType')) {
            case 'compile':
                return euler.springLengthCompile || 80;
            case 'provided':
                return euler.springLengthProvided || 160;
            default:
                return 80;
        }
    },

    // Hooke's law coefficient
    // - The value ranges on [0, 1]
    // - Lower values give looser springs
    // - Higher values give tighter springs
    springCoeff: (edge) => {
        switch (edge.data('linkType')) {
            case 'compile':
                return euler.springCoeffCompile || 0.0008;
            case 'provided':
                return (
                    euler.springCoeffProvided || 0.0008
                );
            default:
                return 0.0008;
        }
    },

    // Theta coefficient from Barnes-Hut simulation
    // - Value ranges on [0, 1]
    // - Performance is better with smaller values
    // - Very small values may not create enough force to give a good result
    theta: 0.666,

    // The amount of time passed per tick
    // - Larger values result in faster runtimes but might spread things out too far
    // - Smaller values produce more accurate results
    timeStep: 20,

    // Prevent the user grabbing nodes during the layout (usually with animate:true)
    ungrabifyWhileSimulating: false,

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
                default: 500,
            },
            dragCoeff: {
                type: 'number',
                title: 'Drag Coefficient',
                default: 0.02,
            },
            fit: {
                type: 'boolean',
                title: 'Fit',
                default: true,
            },
            gravity: {
                type: 'number',
                title: 'Gravity',
                default: -1.2,
            },
            massRoot: {
                type: 'number',
                title: 'Mass (Root)',
                default: 40,
            },
            massChild: {
                type: 'number',
                title: 'Mass (Child)',
                default: 4,
            },
            maxIterations: {
                type: 'number',
                title: 'Max Iterations',
                default: 1000,
            },
            maxSimulationTime: {
                type: 'number',
                title: 'Max Simulation Time',
                default: 4000,
            },
            movementThreshold: {
                type: 'number',
                title: 'Movement Threshold',
                default: 1,
            },
            padding: {
                type: 'number',
                title: 'Padding',
                default: 30,
            },
            pull: {
                type: 'number',
                title: 'Pull',
                default: 0.001,
            },
            refresh: {
                type: 'number',
                title: 'Refresh',
                default: 10,
            },
            springLengthCompile: {
                type: 'number',
                title: 'Spring Length (Compile)',
                default: 80,
            },
            springLengthProvided: {
                type: 'number',
                title: 'Spring Length (Provided)',
                default: 160,
            },
            springCoeffCompile: {
                type: 'number',
                title: 'Spring Coefficient (Compile)',
                default: 0.0008,
                minimum: 0,
                maximum: 1,
            },
            springCoeffProvided: {
                type: 'number',
                title: 'Spring Coefficient (Provided)',
                default: 0.0008,
                minimum: 0,
                maximum: 1,
            },
            theta: {
                type: 'number',
                title: 'Theta (Barnes-Hut)',
                default: 0.666,
                minimum: 0,
                maximum: 1,
            },
            timeStep: {
                type: 'number',
                title: 'TimeStep',
                default: 20,
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

    // https://github.com/cytoscape/cytoscape.js-euler
};

export default euler;
