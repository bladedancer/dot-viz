import config from './config.js';
import { log, highlight, note } from './log.js';
import { spinner } from './spinner.js';
import fs from 'fs/promises';
import StreamZip from 'node-stream-zip';
import path from 'path';

async function storeNames() {
    let feds = (await fs.readdir(config.STORE_PATH, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
    return feds;
}

async function folderExists(path) {
    const result = await fs.stat(path).catch(err => {
        if (isErrorNotFound(err)) {
            return false;
        }
        throw err;
    });

    return !result ? result : result.isDirectory();
}

class DBStore {
    constructor() {
        this.feds = {};
        this.initPromise = this.load();
    }

    async loadFromStore() {
        let paths = await storeNames();
        console.log(paths);
        // TODO LOAD THE FED

        // let rawDefs = await fs.readFile(paths.definitions);
        // let rawInstances = await fs.readFile(paths.instances);
        // this.definitions = JSON.parse(rawDefs);
        // this.instances = JSON.parse(rawInstances);
        return new Promise((resolve) => resolve()); // todo
    }

    async load() {
        this.loading = true;
        return this.loadFromStore().then(() => (this.loading = false));
    }

    async store(fedName, fedPath) {
        // Not particularly secure
        const target = path.join(config.STORE_PATH, fedName);
        const exists = await folderExists(target);
        if (!exists) {
            await fs.mkdir(target);
        }
        console.log(target, fedPath)
        const zip = new StreamZip.async({ file: fedPath });
        await zip.extract(null, target);
        await zip.close();
        return;
    }

    async init() {
        await this.initPromise;
    }
}

const dbstore = new DBStore();
const db = {
    feds: () => dbstore.feds,
    loading: () => dbstore.loading,
    store: async (fedName, fedPath) => dbstore.store(fedName, fedPath),
    init: async (cb) => {
        if (cb) {
            dbstore.initPromise = dbstore.initPromise.then(cb);
        }
        return dbstore.initPromise;
    },
};
export default db;
