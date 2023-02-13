import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { FiGrid, FiPlay, FiPause, FiSettings } from "react-icons/fi";
import Form from "@rjsf/core";
import { useCy } from "../../hooks/useCy";
import { useSetContentModifiedTS } from "../../hooks/useSettings.js";
import Cytoscape from "cytoscape";
import COSEBilkent from "cytoscape-cose-bilkent";
import avsdf from "cytoscape-avsdf";
import fcose from "cytoscape-fcose";
import cola from "cytoscape-cola";
import cise from "cytoscape-cise";
import klay from "cytoscape-klay";
import euler from "cytoscape-euler";
import Button from "../utils/Button.jsx"
import { async } from "regenerator-runtime";
import e from "cors";

Cytoscape.use(euler);
Cytoscape.use(klay);
Cytoscape.use(cise);
Cytoscape.use(cola);
Cytoscape.use(fcose);
Cytoscape.use(avsdf);
Cytoscape.use(COSEBilkent);

function hash(str) {
  var hash = 5381,
      i    = str.length;

  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
}

const supportedLayouts = {
  avsdf: {
    name: "avsdf",
    refresh: 30,
    fit: true,
    padding: 10,
    ungrabifyWhileSimulating: false,
    animate: "end",
    animationDuration: 500,
    nodeSeparation: 60,
    schema: {
      title: "avsdf",
      type: "object",
      properties: {
        animate: {
          type: "string",
          title: "Animate",
          default: "end",
          enum: ["during", "end"],
          description: "Type of layout animation"
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
          description: "Duration for animate:end"
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
          description: "Whether to fit the network view after when done"
        },
        nodeSeparation: {
          type: "number",
          title: "Node Separation",
          default: 60,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 10,
          description: "Padding on fit"
        },
        refresh: {
          type: "number",
          title: "Refresh",
          description: "Number of ticks per frame; higher is faster but more jerky",
          default: 10,
        },
        ungrabifyWhileSimulating: {
          type: "boolean",
          title: "Ungrabify While Simulating",
          default: false,
          description: "Prevent the user grabbing nodes during the layout"
        },
      }
    }
    //https://github.com/iVis-at-Bilkent/cytoscape.js-avsdf
  },
  breadthfirst: {
    name: "breadthfirst",
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
      title: "breadthfirst",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: false,
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
        },
        avoidOverlap: {
          type: "boolean",
          title: "Avoid Overlap",
          default: true,
        },
        circle: {
          type: "boolean",
          title: "Circle",
          default: true,
        },
        directed: {
          type: "boolean",
          title: "Directed",
          default: false,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        grid: {
          type: "boolean",
          title: "Grid",
          default: true,
        },
        maximal: {
          type: "boolean",
          title: "Maximal",
          default: true,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        spacingFactor: {
          type: "number",
          title: "Spacing Factor",
          default: 1.75,
        },
      }
    }
    //https://js.cytoscape.org/#layouts/breadthfirst
  },
  circle: {
    name: "circle",
    animate: false, // whether to transition the node positions
    animationDuration: 500, // duration of animation in ms if enabled
    avoidOverlap: true, // prevents node overlap, may overflow boundingBox and radius if not enough space
    clockwise: true, // whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
    fit: true, // whether to fit the viewport to the graph
    nodeDimensionsIncludeLabels: true, // Excludes the label when calculating node bounding boxes for the layout algorithm
    padding: 30, // the padding on fit
    radius: 100, // the radius of the circle
    spacingFactor: 1, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    startAngle: 3 / 2 * Math.PI, // where nodes start in radians
    sweep: 2 * Math.PI, // how many radians should be between the first and last node (defaults to full circle)
    schema: {
      title: "circle",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: false,
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
        },
        avoidOverlap: {
          type: "boolean",
          title: "Avoid Overlap",
          default: true,
        },
        clockwise: {
          type: "boolean",
          title: "Clockwise",
          default: true,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        radius: {
          type: "number",
          title: "Radius",
        },
        spacingFactor: {
          type: "number",
          title: "Spacing Factor",
          default: 1.75,
        },
        startAngle: {
          type: "number",
          title: "Start Angle",
          default:  3 / 2 * Math.PI,
        },
        sweep: {
          type: "number",
          title: "Sweep",
          default: 2 * Math.PI,
        },
      }
    }
    //https://js.cytoscape.org/#layouts/circle
  },
  cola: {
    name: "cola",
    edgeLength: (e) => {
      let length =
        e.source().data("groupId") === e.target().data("groupId")
          ? supportedLayouts.cola.edgeLengthInScope || 100
          : supportedLayouts.cola.edgeLengthCrossScope || 300;
      return length;
    },

    animate: true, // whether to show the layout as it's running
    infinite: true,
    refresh: 1, // number of ticks per frame; higher is faster but more jerky
    maxSimulationTime: 4000, // max length in ms to run the layout
    ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
    edgeLengthInScope: 100,
    edgeLengthCrossScope: 300,
    fit: false, // on every layout reposition of nodes, fit the viewport
    padding: 30, // padding around the simulation
    nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
    randomize: false, // use random node positions at beginning of layout
    avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    handleDisconnected: true, // if true, avoids disconnected components from overlapping
    convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
    centerGraph: false, // adjusts the node positions initially to center the graph (pass false if you want to start the layout from the current position)

    schema: {
      title: "circle",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: false,
        },
        avoidOverlap: {
          type: "boolean",
          title: "Avoid Overlap",
          default: true,
        },
        centerGraph: {
          type: "boolean",
          title: "Center Graph",
          default: false,
        },
        convergenceThreshold: {
          type: "number",
          title: "Convergence Threshold",
          default: 0.01,
        },
        edgeLengthCrossScope: {
          type: "number",
          title: "Edge Length Cross Scope",
          default: 300,
        },
        edgeLengthInScope: {
          type: "number",
          title: "Edge Length In Scope",
          default: 100,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: false,
        },
        handleDisconnected: {
          type: "boolean",
          title: "Handle Disconnected",
          default: true,
        },
        infinite: {
          type: "boolean",
          title: "Infinite",
          default: true,
        },
        maxSimulationTime: {
          type: "number",
          title: "Max Simulation Time",
          default: 4000,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        randomize: {
          type: "boolean",
          title: "Randomize",
          default: false,
        },
        refresh: {
          type: "number",
          title: "Refresh",
          default: 1,
        },
        ungrabifyWhileSimulating: {
          type: "boolean",
          title: "Ungrabify While Simulating",
          default: false,
        },
      }
    }
    //https://github.com/cytoscape/cytoscape.js-cola
  },
  concentric: {
    name: "concentric",

    animate: false, // whether to transition the node positions
    animationDuration: 500, // duration of animation in ms if enabled
    avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
    clockwise: true, // whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
    concentric: (n) => {
      let con = 1;
      switch(supportedLayouts.concentric.concentricAlgo) {
        case "indegree":
          con = n.indegree() + 1;
          break;
        case "outdegree":
          con = n.outdegree() + 1;
          break;
        case "fixedScope":
          con = n.data("root") ? 20 : n.degree() + 1;
          break;
        default:
          con = n.degree() + 1;
      }
      console.log(con);
      return con;
    },
    equidistant: false, // whether levels have an equal radial distance betwen them, may cause bounding box overflow
    fit: true, // whether to fit the viewport to the graph
    levelWidth: (n) => supportedLayouts.concentric.levelWidthValue || 2,
    minNodeSpacing: 10, // min spacing between outside of nodes (used for radius adjustment)
    nodeDimensionsIncludeLabels: true, // Excludes the label when calculating node bounding boxes for the layout algorithm
    padding: 30, // the padding on fit
    startAngle: 3 / 2 * Math.PI, // where nodes start in radians
    spacingFactor: 1, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    sweep: 2 * Math.PI, // how many radians should be between the first and last node (defaults to full circle)
    schema: {
      title: "concentric",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: false,
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
        },
        avoidOverlap: {
          type: "boolean",
          title: "Avoid Overlap",
          default: true,
        },
        clockwise: {
          type: "boolean",
          title: "Clockwise",
          default: true,
        },
        concentricAlgo: {
          type: "string",
          title: "Concentric",
          enum: ["degree", "indegree", "outdegree", "fixedScope"],
          default: "degree"
        },
        equidistant: {
          type: "boolean",
          title: "Equidistant",
          default: false,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        levelWidthValue: {
          type: "number",
          title: "Level Width",
          default: 2,
        },
        minNodeSpacing: {
          type: "number",
          title: "Min Node Spacing",
          default: 10,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        spacingFactor: {
          type: "number",
          title: "Spacing Factor",
          default: 1,
        },
        startAngle: {
          type: "number",
          title: "Start Angle",
          default:  3 / 2 * Math.PI,
        },
        sweep: {
          type: "number",
          title: "Sweep",
          default: 2 * Math.PI,
        },
      }
    }
    // https://js.cytoscape.org/#layouts/concentric
  },
  cise: {
    name: "cise",

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
      switch(supportedLayouts.cise.clusterBy) {
        case "kind":
          return hash(n.data("kind"));
        case "group":
          return n.data("apigroup");
        case "scope":
          return n.data("groupIndex");
        default:
          return n.data("groupIndex");
        }
    },

    // Whether to pull on-circle nodes inside of the circle
    allowNodesInsideCircle: true,

    // -------- Optional parameters --------
    // Whether to animate the layout
    // - true : Animate while the layout is running
    // - false : Just show the end result
    // - 'end' : Animate directly to the end result
    animate: true,

    // What grouping to use - scope, kind, group
    clusterBy: "scope",

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
      title: "cise",
      type: "object",
      properties: {
        allowNodesInsideCircle: {
          type: "boolean",
          title: "Allow Nodes Inside Circle",
          default: true,
        },
        animate: {
          type: "boolean",
          title: "Animate",
          default: true,
        },
        clusterBy: {
          type: "string",
          title: "Cluster By",
          enum: ["scope", "kind", "group"],
          default: "groupIndex"
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        gravity: {
          type: "number",
          title: "Gravity",
          default: 0.25,
        },
        gravityRange: {
          type: "number",
          title: "Gravity Range",
          default: 3.8,
        },
        idealInterClusterEdgeLengthCoefficient: {
          type: "number",
          title: "Ideal Inter Cluster Edge Length Coefficient",
          default: 2,
        },
        maxRatioOfNodesInsideCircle: {
          type: "number",
          title: "Max Ratio Of Nodes Inside Circle",
          default: 0.1,
        },
        nodeRepulsion: {
          type: "number",
          title: "Node Repulsion",
          default: 4500,
        },
        nodeSeparation: {
          type: "number",
          title: "Node Separation",
          default: 12.5,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        refresh: {
          type: "number",
          title: "Refresh",
          default: 10,
        },
        springCoeff: {
          type: "number",
          title: "Spring Coeff",
          default: 0.45,
        },
      }
    }
    // https://github.com/iVis-at-Bilkent/cytoscape.js-cise
  },
  cose: {
    name: "cose",

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
    edgeElasticity: function( edge ){
      switch (edge.data("type")) {
        case "scope":
          return supportedLayouts.cose.edgeElasticityScope || 32;
        case "hard":
          return supportedLayouts.cose.edgeElasticityHard || 32;
        case "soft":
          return supportedLayouts.cose.edgeElasticitySoft || 32;
        default:
          return 32;
      }
    },

    // Whether to fit the network view after when done
    fit: true,

    // Gravity force (constant)
    gravity: 1,

    // Ideal edge (non nested) length
    idealEdgeLength: function( edge ){
      switch (edge.data("type")) {
        case "scope":
          return supportedLayouts.cose.idealEdgeLengthScope || 32;
        case "hard":
          return supportedLayouts.cose.idealEdgeLengthHard || 32;
        case "soft":
          return supportedLayouts.cose.idealEdgeLengthSoft || 32;
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
    nodeRepulsion: function( node ){
      if (node.data("root")) {
        return supportedLayouts.cose.nodeRepulsionScope || 2048;
      } else {
        return supportedLayouts.cose.nodeRepulsionResource || 2048;
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
      title: "cise",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: true,
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 10000,
        },
        componentSpacing: {
          type: "number",
          title: "Component Spacing",
          default: 40,
        },
        coolingFactor: {
          type: "number",
          title: "Cooling Factor",
          default: 0.99,
        },
        edgeElasticityScope: {
          type: "number",
          title: "Edge Elasticity (Scope)",
          default: 32,
        },
        edgeElasticityHard: {
          type: "number",
          title: "Edge Elasticity (Hard)",
          default: 32,
        },
        edgeElasticitySoft: {
          type: "number",
          title: "Edge Elasticity (Soft)",
          default: 32,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        gravity: {
          type: "number",
          title: "Gravity",
          default: 1,
        },
        idealEdgeLengthScope: {
          type: "number",
          title: "Ideal Edge Length (Scope)",
          default: 32,
        },
        idealEdgeLengthHard: {
          type: "number",
          title: "Ideal Edge Length (Hard)",
          default: 32,
        },
        idealEdgeLengthSoft: {
          type: "number",
          title: "Ideal Edge Length (Soft)",
          default: 32,
        },
        initialTemp: {
          type: "number",
          title: "Initial Temp",
          default: 1000,
        },
        minTemp: {
          type: "number",
          title: "Min Temp",
          default: 1,
        },
        nestingFactor: {
          type: "number",
          title: "Nesting Factor",
          default: 1.2,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        nodeRepulsionScope: {
          type: "number",
          title: "Node Repulsion (Scope)",
          default: 2048,
        },
        nodeRepulsionResource: {
          type: "number",
          title: "Node Repulsion (Resource)",
          default: 2048,
        },
        nodeOverlap: {
          type: "number",
          title: "Node Overlap",
          default: 4,
        },
        numIter: {
          type: "number",
          title: "Number of Iterations",
          default: 1000,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        randomize: {
          type: "boolean",
          title: "Randomize",
          default: false,
        },
        refresh: {
          type: "number",
          title: "Refresh",
          default: 10,
        },

      }
    }
    // https://js.cytoscape.org/#layouts/cose
  },
  "cose-bilkent": {
    name: "cose-bilkent",
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
      title: "cise",
      type: "object",
      properties: {
        animateBool: {
          type: "string",
          title: "Animate",
          enum: ["during", "end"],
          default: "during",
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
        },
        edgeElasticity: {
          type: "number",
          title: "Edge Elasticity",
          default: 0.45,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        gravity: {
          type: "number",
          title: "Gravity",
          default: 0.25,
        },
        gravityRange: {
          type: "number",
          title: "Gravity Range",
          default: 3.8,
        },
        gravityCompound: {
          type: "number",
          title: "Gravity for Compound",
          default: 1,
        },
        gravityRangeCompound: {
          type: "number",
          title: "Gravity Range for Compounds",
          default: 1.5,
        },
        idealEdgeLength: {
          type: "number",
          title: "Ideal Edge Length",
          default: 50,
        },
        initialEnergyOnIncremental: {
          type: "number",
          title: "initial Energy On Incremental",
          default: 0.5,
        },
        nestingFactor: {
          type: "number",
          title: "Nesting Factor",
          default: 0.1,
        },
        nodeRepulsion: {
          type: "number",
          title: "Node Repulsion",
          default: 4500,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        numIter: {
          type: "number",
          title: "Number of Iterations",
          default: 2500,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30,
        },
        quality: {
          type: "string",
          title: "Quality",
          enum: ["draft", "default", "proof"],
          default: "default",
        },
        randomize: {
          type: "boolean",
          title: "Randomize",
          default: false,
        },
        refresh: {
          type: "number",
          title: "Refresh",
          default: 30,
        },
        tile: {
          type: "boolean",
          title: "Tile",
          default: true,
        },
        tilingPaddingHorizontal: {
          type: "number",
          title: "Tiling Padding Horizontal",
          default: 10,
        },
        tilingPaddingVertical: {
          type: "number",
          title: "Tiling Padding Vertical",
          default: 10,
        },
      }
    }
    //https://github.com/cytoscape/cytoscape.js-cose-bilkent
  },
  // "d3-force": {
  //   name: "d3-force",
  //   link: (d) => d.data("id")

  //   // https://github.com/shichuanpo/cytoscape.js-d3-force
  // },
  euler: {
    name: "euler",

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
    mass: node => {
      if (node.data("root")) {
        return supportedLayouts.euler.massScope || 40;
      } else {
        return supportedLayouts.euler.massResource || 4;
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
    springLength: edge => {
      switch (edge.data("type")) {
        case "scope":
          return supportedLayouts.euler.springLengthScope || 80;
        case "hard":
          return supportedLayouts.euler.springLengthHard || 160;
        case "soft":
          return supportedLayouts.euler.springLengthSoft || 160;
        default:
          return 80;
      }
    },

    // Hooke's law coefficient
    // - The value ranges on [0, 1]
    // - Lower values give looser springs
    // - Higher values give tighter springs
    springCoeff: edge => {
      switch (edge.data("type")) {
        case "scope":
          return supportedLayouts.euler.springCoeffScope || .0008;
        case "hard":
          return supportedLayouts.euler.springCoeffHard || .0008;
        case "soft":
          return supportedLayouts.euler.springCoeffSoft || .0008;
        default:
          return .0008;
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
      title: "euler",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: "true",
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
        },
        dragCoeff: {
          type: "number",
          title: "Drag Coefficient",
          default: 0.02
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        gravity: {
          type: "number",
          title: "Gravity",
          default: -1.2,
        },
        massScope: {
          type: "number",
          title: "Mass (Scope)",
          default: 40,
        },
        massResource: {
          type: "number",
          title: "Mass (Resource)",
          default: 4,
        },
        maxIterations: {
          type: "number",
          title: "Max Iterations",
          default: 1000,
        },
        maxSimulationTime: {
          type: "number",
          title: "Max Simulation Time",
          default: 4000,
        },
        movementThreshold: {
          type: "number",
          title: "Movement Threshold",
          default: 1,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30
        },
        pull: {
          type: "number",
          title: "Pull",
          default: 0.001
        },
        refresh: {
          type: "number",
          title: "Refresh",
          default: 10,
        },
        springLengthScope: {
          type: "number",
          title: "Spring Length (Scope)",
          default: 80,
        },
        springLengthHard: {
          type: "number",
          title: "Spring Length (Hard)",
          default: 160,
        },
        springLengthSoft: {
          type: "number",
          title: "Spring Length (Soft)",
          default: 160,
        },
        springCoeffScope: {
          type: "number",
          title: "Spring Coefficient (Scope)",
          default: .0008,
          minimum: 0,
          maximum: 1
        },
        springCoeffHard: {
          type: "number",
          title: "Spring Coefficient (Hard)",
          default: .0008,
          minimum: 0,
          maximum: 1
        },
        springCoeffSoft: {
          type: "number",
          title: "Spring Coefficient (Soft)",
          default: .0008,
          minimum: 0,
          maximum: 1
        },
        theta: {
          type: "number",
          title: "Theta (Barnes-Hut)",
          default: .666,
          minimum: 0,
          maximum: 1
        },
        timeStep: {
          type: "number",
          title: "TimeStep",
          default: 20,
        },
        ungrabifyWhileSimulating: {
          type: "boolean",
          title: "Ungrabify While Simulating",
          default: false,
          description: "Prevent the user grabbing nodes during the layout"
        },
      }
    }

    // https://github.com/cytoscape/cytoscape.js-euler
  },
  fcose: {
    name: "fcose",
    nodeDimensionsIncludeLabels: true,
    packComponents: false,
    nodeRepulsion: (n) => n.data('isScope') ? 8000 : 4500,
    idealEdgeLength: (e) => {
      let type = e.data("type");
      if (e.type === "scope") {
        return 50;
      } else if (e.type === "soft") {
        return 100;
      } else {
        return 300;
      }
    },
    edgeElasticity: (e) => {
      let type = e.data("type");
      if (e.type === "scope") {
        return 0.1;
      } else if (e.type === "soft") {
        return 0.9;
      } else {
        return 0.45;
      }
    },
    //https://github.com/iVis-at-Bilkent/cytoscape.js-fcose
  },
  grid: {
    name: "grid",
  },
  klay: {
    name: "klay",
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
      nodeLayering:'NETWORK_SIMPLEX', // Strategy for node layering.
      /* NETWORK_SIMPLEX This algorithm tries to minimize the length of edges. This is the most computationally intensive algorithm. The number of iterations after which it aborts if it hasn't found a result yet can be set with the Maximal Iterations option.
      LONGEST_PATH A very simple algorithm that distributes nodes along their longest path to a sink node.
      INTERACTIVE Distributes the nodes into layers by comparing their positions before the layout algorithm was started. The idea is that the relative horizontal order of nodes as it was before layout was applied is not changed. This of course requires valid positions for all nodes to have been set on the input graph before calling the layout algorithm. The interactive node layering algorithm uses the Interactive Reference Point option to determine which reference point of nodes are used to compare positions. */
      nodePlacement:'BRANDES_KOEPF', // Strategy for Node Placement
      /* BRANDES_KOEPF Minimizes the number of edge bends at the expense of diagram size: diagrams drawn with this algorithm are usually higher than diagrams drawn with other algorithms.
      LINEAR_SEGMENTS Computes a balanced placement.
      INTERACTIVE Tries to keep the preset y coordinates of nodes from the original layout. For dummy nodes, a guess is made to infer their coordinates. Requires the other interactive phase implementations to have run as well.
      SIMPLE Minimizes the area at the expense of... well, pretty much everything else. */
      randomizationSeed: 1, // Seed used for pseudo-random number generators to control the layout algorithm; 0 means a new seed is generated
      routeSelfLoopInside: false, // Whether a self-loop is routed around or inside its node.
      separateConnectedComponents: true, // Whether each connected component should be processed separately
      spacing: 20, // Overall setting for the minimal amount of space to be left between objects
      thoroughness: 7 // How much effort should be spent to produce a nice layout..
    },

    schema: {
      title: "euler",
      type: "object",
      properties: {
        animate: {
          type: "boolean",
          title: "Animate",
          default: "true",
        },
        animationDuration: {
          type: "number",
          title: "Animation Duration",
          default: 500,
        },
        fit: {
          type: "boolean",
          title: "Fit",
          default: true,
        },
        nodeDimensionsIncludeLabels: {
          type: "boolean",
          title: "Node Dimensions Include Labels",
          default: true,
        },
        padding: {
          type: "number",
          title: "Padding",
          default: 30
        },
        klay: {
          type: "object",
          title: "KLAY",
          properties: {
            addUnnecessaryBendpoints: {
              type: "boolean",
              title: "Add Unnecessary Bendpoints",
              default: false
            },
            aspectRatio: {
              type: "number",
              title: "Aspect Ratio",
              default: 1.6
            },
            borderSpacing: {
              type: "number",
              title: "Border Spacing",
              default: 20
            },
            compactComponents: {
              type: "boolean",
              title: "Compact Components",
              default: true
            },
            crossingMinimization: {
              type: "string",
              title: "Crossing Minimization",
              enum: ["LAYER_SWEEP", "INTERACTIVE"],
              default: 'LAYER_SWEEP'
            },
            cycleBreaking: {
              type: "string",
              title: "Cycle Breaking",
              enum: ["GREEDY", "INTERACTIVE"],
              default: 'GREEDY'
            },
            direction: {
              type: "string",
              title: "Direction",
              enum: ["UNDEFINED", "RIGHT", "LEFT", "DOWN", "UP"],
              default: 'UNDEFINED'
            },
            edgeRouting: {
              type: "string",
              title: "Edge Routing",
              enum: ["ORTHOGONAL", "POLYLINE", "SPLINES"],
              default: 'ORTHOGONAL'
            },
            edgeSpacingFactor: {
              type: "number",
              title: "Edge Spacing Factor",
              default: 0.5
            },
            feedbackEdges: {
              type: "boolean",
              title: "Feedback Edges",
              default: false
            },
            fixedAlignment: {
              type: "string",
              title: "Fixed Alignment",
              enum: ["NONE", "LEFTUP", "RIGHTUP", "LEFTDOWN", "RIGHTDOWN", "BALANCED"],
              default: 'NONE'
            },
            inLayerSpacingFactor: {
              type: "number",
              title: "Inlayer Spacing Factor",
              default: 1
            },
            layoutHierarchy: {
              type: "boolean",
              title: "Layout Hierarchy",
              default: false
            },
            linearSegmentsDeflectionDampening: {
              type: "number",
              title: "Linear Segments Deflection Dampening",
              default: 0.3
            },
            mergeEdges: {
              type: "boolean",
              title: "Merge Edges",
              default: false
            },
            mergeHierarchyCrossingEdges: {
              type: "boolean",
              title: "Merge Hierarchy Crossing Edges",
              default: true
            },
            nodeLayering: {
              type: "string",
              title: "Node Layering",
              enum: ["NETWORK_SIMPLEX", "LONGEST_PATH", "INTERACTIVE"],
              default: 'NETWORK_SIMPLEX'
            },
            nodePlacement: {
              type: "string",
              title: "Node Layering",
              enum: ["BRANDES_KOEPF", "LINEAR_SEGMENTS", "SIMPLE", "INTERACTIVE"],
              default: 'BRANDES_KOEPF'
            },
            randomizationSeed: {
              type: "number",
              title: "Randomization Seed",
              default: 1
            },
            routeSelfLoopInside: {
              type: "boolean",
              title: "Route Self Loop Inside",
              default: false
            },
            separateConnectedComponents: {
              type: "boolean",
              title: "Separate Connected Components",
              default: true
            },
            spacing: {
              type: "number",
              title: "Spacing",
              default: 20
            },
            thoroughness: {
              type: "number",
              title: "Thoroughness",
              default: 7
            },
          }
        },
      }
    }
    //https://github.com/cytoscape/cytoscape.js-klay/blob/master/README.md
  },
  random: {
    name: "random",
  }
};

const LayoutControl = ({
  className,
  style,
  children
}) => {
  const cy = useCy();
  const [opened, setOpened] = useState(false);
  const [layoutConfigOpened, setLayoutConfigOpened] = useState(false);
  const [layoutOverrides, setLayoutOverrides] = useState({});
  const [layout, setLayout] = useState("breadthfirst");
  const [activeLayout, setActiveLayout] = useState();
  const {contentModifiedTS} = useSetContentModifiedTS();
  const isMounted = useRef(false);

  // Common html props for the div wrapper
  const htmlProps = {
    style,
    className: `react-cy-control ${className || ""}`,
  };

  const layouts = useMemo(() => {
    // Merge the overrides with the defaults
    Object.keys(layoutOverrides).forEach(k => {
      supportedLayouts[k] = {...supportedLayouts[k], ...layoutOverrides[k]}
    });
    return supportedLayouts;
  }, [layoutOverrides]);

  const runLayout = useCallback(async () => {
    if (activeLayout) {
      activeLayout.stop();
//      await activeLayout.pon("layoutstop"); // Think there's a race wiith the disable effect.
    }

    let lay = cy.elements(":visible").layout(layouts[layout]);
    if (lay.options.animate) {
      setActiveLayout(lay);
    } else {
      setActiveLayout(null);
    }

    lay.run();
  }, [cy, layout, activeLayout, setActiveLayout]);

  const stopLayout = useCallback(() => {
    activeLayout && activeLayout.stop();
    setActiveLayout(null);
  }, [cy, activeLayout, setActiveLayout]);


  // Update layout on change
  useEffect(async () => {
    if (!cy) {
      return;
    }
    await stopLayout();
    await runLayout()
  }, [cy, contentModifiedTS(), layout]);

  // Disable stop button when layout auto-stops
  useEffect(async () => {
    if (!activeLayout) {
      return;
    }
    await activeLayout.pon("layoutstop");
    activeLayout.stop(); // Explicitly stop it anyway
    setActiveLayout(null);
  }, [activeLayout, setActiveLayout]);

  // When the overrides change rerun layout
  useEffect(async () => {
    if (isMounted.current) {
      runLayout();
    } else {
      isMounted.current = true;
    }
  }, [layoutConfigOpened, layoutOverrides])

  return (
    <>
      <div {...htmlProps}>
        <button onClick={() => {
          setOpened(!opened);
          setLayoutConfigOpened(false);
        }} title="Select layout">
          <FiGrid />
        </button>
        {opened === true && (
          <ul
            style={{
              position: "absolute",
              bottom: 0,
              right: "35px",
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {Object.keys(layouts).map((name) => {
              const hasSchema = !!layouts[layout].schema;
              return (
                <li key={name} className="layout-option">
                <Button
                  title={name}
                  active={layout == name}
                  action={() => {
                    setLayout(name);
                    setOpened(false);
                    setLayoutConfigOpened(false);
                  }}
                  altIcon={hasSchema && <FiSettings />}
                  altEnabled={hasSchema && (layout == name)}
                  altAction={hasSchema && (() => {
                    setLayoutConfigOpened(true);
                    setOpened(false);
                  })} />
                  </li>);
            })}
          </ul>
        )}
        {layoutConfigOpened === true && (
          <div className="layout-config">
            <Form
              schema={layouts[layout].schema}
              formData={layouts[layout]}
              uiSchema={{
                "ui:submitButtonOptions": {"norender": true}
              }}
              onChange={({formData}, e) => {
                setLayoutOverrides({
                  [layout]: formData
                });
              }}
            />
          </div>
        )}
      </div>
      <div {...htmlProps}>
        <button onClick={() => runLayout()} title="Re-run layout" disabled={activeLayout}>
          <FiPlay />
        </button>
      </div>
      <div {...htmlProps}>
        <button onClick={() => stopLayout()} title="Stop layout" disabled={!activeLayout || !activeLayout.options.animate}>
          <FiPause />
        </button>
      </div>
    </>
  );
};
export default LayoutControl;
