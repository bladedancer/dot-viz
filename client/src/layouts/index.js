import Cytoscape from 'cytoscape';
import COSEBilkent from 'cytoscape-cose-bilkent';
import avsdfPlugin from 'cytoscape-avsdf';
import fcosePlugin from 'cytoscape-fcose';
import colaPlugin from 'cytoscape-cola';
import cisePlugin from 'cytoscape-cise';
import klayPlugin from 'cytoscape-klay';
import eulerPlugin from 'cytoscape-euler';

Cytoscape.use(eulerPlugin);
Cytoscape.use(klayPlugin);
Cytoscape.use(cisePlugin);
Cytoscape.use(colaPlugin);
Cytoscape.use(fcosePlugin);
Cytoscape.use(avsdfPlugin);
Cytoscape.use(COSEBilkent);

import avsdf from './avsdf.js';
import breadthfirst from './breadthfirst.js';
import circle from './circle.js';
import cola from './cola.js';
import concentric from './concentric.js';
import cise from './cise.js';
import cose from './cose.js';
import coseBilkent from './cose-bilkent.js';
import euler from './euler.js';
import fcose from './fcose.js';
import grid from './grid.js';
import klay from './klay.js';
import random from './random.js';

const supportedLayouts = {
    avsdf,
    breadthfirst,
    circle,
    cola,
    concentric,
    cise,
    cose,
    'cose-bilkent': coseBilkent,
    euler,
    fcose,
    grid,
    klay,
    random,
};

export default supportedLayouts;
