const klay = {
    name: 'klay',
    nodeDimensionsIncludeLabels: true, // Boolean which changes whether label dimensions are included when calculating node dimensions
    fit: true, // Whether to fit
    padding: 30, // Padding on fit
    animate: true, // Whether to transition the node positions
    animationDuration: 500, // Duration of animation in ms if enabled

    klay: {
        // Following descriptions taken from http://layout.rtsys.informatik.uni-kiel.de:9444/Providedlayout.html?algorithm=de.cau.cs.kieler.klay.layered
        addUnnecessaryBendpoints: false, // Adds bend points even if an edge does not change direction.
        aspectRatio: 1.6, // The aimed aspect ratio of the drawing, that is the quotient of width by height
        borderSpacing: 20, // Minimal amount of space to be left to the border
        compactComponents: true, // Tries to further compact components (disconnected sub-graphs).
        crossingMinimization: 'LAYER_SWEEP', // Strategy for crossing minimization.
        /* LAYER_SWEEP The layer sweep algorithm iterates multiple times over the layers, trying to find node orderings that minimize the number of crossings. The algorithm uses randomization to increase the odds of finding a good result. To improve its results, consider increasing the Thoroughness option, which influences the number of iterations done. The Randomization seed also influences results.
      INTERACTIVE Orders the nodes of each layer by comparing their positions before the layout algorithm was started. The idea is that the relative order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive layer sweep algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
        cycleBreaking: 'GREEDY', // Strategy for cycle breaking. Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles. Reversed edges will end up pointing to the opposite direction of regular edges (that is, reversed edges will point left if edges usually point right).
        /* GREEDY This algorithm reverses edges greedily. The algorithm tries to avoid edges that have the Priority property set.
      INTERACTIVE The interactive algorithm tries to reverse edges that already pointed leftwards in the input graph. This requires node and port coordinates to have been set to sensible values.*/
        direction: 'UNDEFINED', // Overall direction of edges: horizontal (right / left) or vertical (down / up)
        /* UNDEFINED, RIGHT, LEFT, DOWN, UP */
        edgeRouting: 'ORTHOGONAL', // Defines how edges are routed (POLYLINE, ORTHOGONAL, SPLINES)
        edgeSpacingFactor: 0.5, // Factor by which the object spacing is multiplied to arrive at the minimal spacing between edges.
        feedbackEdges: false, // Whether feedback edges should be highlighted by routing around the nodes.
        fixedAlignment: 'NONE', // Tells the BK node placer to use a certain alignment instead of taking the optimal result.  This option should usually be left alone.
        /* NONE Chooses the smallest layout from the four possible candidates.
      LEFTUP Chooses the left-up candidate from the four possible candidates.
      RIGHTUP Chooses the right-up candidate from the four possible candidates.
      LEFTDOWN Chooses the left-down candidate from the four possible candidates.
      RIGHTDOWN Chooses the right-down candidate from the four possible candidates.
      BALANCED Creates a balanced layout from the four possible candidates. */
        inLayerSpacingFactor: 1.0, // Factor by which the usual spacing is multiplied to determine the in-layer spacing between objects.
        layoutHierarchy: false, // Whether the selected layouter should consider the full hierarchy
        linearSegmentsDeflectionDampening: 0.3, // Dampens the movement of nodes to keep the diagram from getting too large.
        mergeEdges: false, // Edges that have no ports are merged so they touch the connected nodes at the same points.
        mergeHierarchyCrossingEdges: true, // If hierarchical layout is active, hierarchy-crossing edges use as few hierarchical ports as possible.
        nodeLayering: 'NETWORK_SIMPLEX', // Strategy for node layering.
        /* NETWORK_SIMPLEX This algorithm tries to minimize the length of edges. This is the most computationally intensive algorithm. The number of iterations after which it aborts if it hasn't found a result yet can be set with the Maximal Iterations option.
      LONGEST_PATH A very simple algorithm that distributes nodes along their longest path to a sink node.
      INTERACTIVE Distributes the nodes into layers by comparing their positions before the layout algorithm was started. The idea is that the relative horizontal order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive node layering algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
        nodePlacement: 'BRANDES_KOEPF', // Strategy for Node Placement
        /* BRANDES_KOEPF Minimizes the number of edge bends at the expense of diagram size: diagrams drawn with this algorithm are usually higher than diagrams drawn with other algorithms.
      LINEAR_SEGMENTS Computes a balanced placement.
      INTERACTIVE Tries to keep the preset y coordinates of nodes from the original layout. For dummy nodes, a guess is made to infer their coordinates. Requires the other interactive phase implementations to have run as well.
      SIMPLE Minimizes the area at the expense of... well, pretty much everything else. */
        randomizationSeed: 1, // Seed used for pseudo-random number generators to control the layout algorithm; 0 means a new seed is generated
        routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
        separateConnectedComponents: true, // Whether each connected component should be processed separately
        spacing: 20, // Overall setting for the minimal amount of space to be left between objects
        thoroughness: 7, // How much effort should be spent to produce a nice layout..
    },

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
            klay: {
                type: 'object',
                title: 'KLAY',
                properties: {
                    addUnnecessaryBendpoints: {
                        type: 'boolean',
                        title: 'Add Unnecessary Bendpoints',
                        default: false,
                    },
                    aspectRatio: {
                        type: 'number',
                        title: 'Aspect Ratio',
                        default: 1.6,
                    },
                    borderSpacing: {
                        type: 'number',
                        title: 'Border Spacing',
                        default: 20,
                    },
                    compactComponents: {
                        type: 'boolean',
                        title: 'Compact Components',
                        default: true,
                    },
                    crossingMinimization: {
                        type: 'string',
                        title: 'Crossing Minimization',
                        enum: ['LAYER_SWEEP', 'INTERACTIVE'],
                        default: 'LAYER_SWEEP',
                    },
                    cycleBreaking: {
                        type: 'string',
                        title: 'Cycle Breaking',
                        enum: ['GREEDY', 'INTERACTIVE'],
                        default: 'GREEDY',
                    },
                    direction: {
                        type: 'string',
                        title: 'Direction',
                        enum: ['UNDEFINED', 'RIGHT', 'LEFT', 'DOWN', 'UP'],
                        default: 'UNDEFINED',
                    },
                    edgeRouting: {
                        type: 'string',
                        title: 'Edge Routing',
                        enum: ['ORTHOGONAL', 'POLYLINE', 'SPLINES'],
                        default: 'ORTHOGONAL',
                    },
                    edgeSpacingFactor: {
                        type: 'number',
                        title: 'Edge Spacing Factor',
                        default: 0.5,
                    },
                    feedbackEdges: {
                        type: 'boolean',
                        title: 'Feedback Edges',
                        default: false,
                    },
                    fixedAlignment: {
                        type: 'string',
                        title: 'Fixed Alignment',
                        enum: [
                            'NONE',
                            'LEFTUP',
                            'RIGHTUP',
                            'LEFTDOWN',
                            'RIGHTDOWN',
                            'BALANCED',
                        ],
                        default: 'NONE',
                    },
                    inLayerSpacingFactor: {
                        type: 'number',
                        title: 'Inlayer Spacing Factor',
                        default: 1,
                    },
                    layoutHierarchy: {
                        type: 'boolean',
                        title: 'Layout Hierarchy',
                        default: false,
                    },
                    linearSegmentsDeflectionDampening: {
                        type: 'number',
                        title: 'Linear Segments Deflection Dampening',
                        default: 0.3,
                    },
                    mergeEdges: {
                        type: 'boolean',
                        title: 'Merge Edges',
                        default: false,
                    },
                    mergeHierarchyCrossingEdges: {
                        type: 'boolean',
                        title: 'Merge Hierarchy Crossing Edges',
                        default: true,
                    },
                    nodeLayering: {
                        type: 'string',
                        title: 'Node Layering',
                        enum: [
                            'NETWORK_SIMPLEX',
                            'LONGEST_PATH',
                            'INTERACTIVE',
                        ],
                        default: 'NETWORK_SIMPLEX',
                    },
                    nodePlacement: {
                        type: 'string',
                        title: 'Node Layering',
                        enum: [
                            'BRANDES_KOEPF',
                            'LINEAR_SEGMENTS',
                            'SIMPLE',
                            'INTERACTIVE',
                        ],
                        default: 'BRANDES_KOEPF',
                    },
                    randomizationSeed: {
                        type: 'number',
                        title: 'Randomization Seed',
                        default: 1,
                    },
                    routeSelfLoopInside: {
                        type: 'boolean',
                        title: 'Route Self Loop Inside',
                        default: false,
                    },
                    separateConnectedComponents: {
                        type: 'boolean',
                        title: 'Separate Connected Components',
                        default: true,
                    },
                    spacing: {
                        type: 'number',
                        title: 'Spacing',
                        default: 20,
                    },
                    thoroughness: {
                        type: 'number',
                        title: 'Thoroughness',
                        default: 7,
                    },
                },
            },
        },
    },
    //https://github.com/cytoscape/cytoscape.js-klay/blob/master/README.md
};

export default klay;
