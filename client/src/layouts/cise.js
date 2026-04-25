function hash(str) {
    var hash = 5381,
        i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
     * integers. Since we want the results to be always positive, convert the
     * signed int to an unsigned by doing an unsigned bitshift. */
    return hash >>> 0;
}

const cise = {
    name: 'cise',

    // -------- Optional parameters --------
    // Whether to animate the layout
    // - true : Animate while the layout is running
    // - false : Just show the end result
    // - 'end' : Animate directly to the end result
    animate: true,

    // ClusterInfo can be a 2D array contaning node id's or a function that returns cluster ids.
    // For the 2D array option, the index of the array indicates the cluster ID for all elements in
    // the collection at that index. Unclustered nodes must NOT be present in this array of clusters.
    //
    // For the function, it would be given a Cytoscape node and it is expected to return a cluster id
    // corresponding to that node. Returning negative numbers, null or undefined is fine for unclustered
    // nodes.
    // e.g
    // Array:                                     OR          function(node){
    //  [ ['n1','n2','n3'],                                       ...
    //    ['n5','n6']                                         }
    //    ['n7', 'n8', 'n9', 'n10'] ]
    clusters: (n) => {
        switch (cise.clusterBy) {
            case 'group':
                return hash(n.data('group'));
            default:
                return hash(n.data('group'));
        }
    },

    // Whether to pull on-circle nodes inside of the circle
    allowNodesInsideCircle: true,

    // What grouping to use - group
    clusterBy: 'group',

    // Whether to fit the viewport to the repositioned graph
    // true : Fits at end of layout for animate:false or animate:'end'
    fit: false,

    // Gravity force (constant)
    gravity: 0.25,

    // Gravity range (constant)
    gravityRange: 3.8,

    // Inter-cluster edge length factor
    // (2.0 means inter-cluster edges should be twice as long as intra-cluster edges)
    idealInterClusterEdgeLengthCoefficient: 2,

    // Max percentage of the nodes in a circle that can move inside the circle
    maxRatioOfNodesInsideCircle: 0.1,

    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: 4500,

    // separation amount between nodes in a cluster
    // note: increasing this amount will also increase the simulation time
    nodeSeparation: 12.5,

    // Padding in rendered co-ordinates around the layout
    padding: 30,

    // number of ticks per frame; higher is faster but more jerky
    refresh: 10,

    // - Lower values give looser springs
    // - Higher values give tighter springs
    springCoeff: 0.45,

    schema: {
        title: 'cise',
        type: 'object',
        properties: {
            allowNodesInsideCircle: {
                type: 'boolean',
                title: 'Allow Nodes Inside Circle',
                default: true,
            },
            animate: {
                type: 'boolean',
                title: 'Animate',
                default: true,
            },
            clusterBy: {
                type: 'string',
                title: 'Cluster By',
                enum: ['group'],
                default: 'group',
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
            idealInterClusterEdgeLengthCoefficient: {
                type: 'number',
                title: 'Ideal Inter Cluster Edge Length Coefficient',
                default: 2,
            },
            maxRatioOfNodesInsideCircle: {
                type: 'number',
                title: 'Max Ratio Of Nodes Inside Circle',
                default: 0.1,
            },
            nodeRepulsion: {
                type: 'number',
                title: 'Node Repulsion',
                default: 4500,
            },
            nodeSeparation: {
                type: 'number',
                title: 'Node Separation',
                default: 12.5,
            },
            padding: {
                type: 'number',
                title: 'Padding',
                default: 30,
            },
            refresh: {
                type: 'number',
                title: 'Refresh',
                default: 10,
            },
            springCoeff: {
                type: 'number',
                title: 'Spring Coeff',
                default: 0.45,
            },
        },
    },
    // https://github.com/iVis-at-Bilkent/cytoscape.js-cise
};

export default cise;
