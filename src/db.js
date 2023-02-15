import config from './config.js';
import { log, highlight, note } from './log.js';
import fs from 'fs/promises';
import path from 'path';

const ENTITYSTORES = 'entitystores.json';

async function storeNames() {
    let feds = (await fs.readdir(config.STORE_PATH, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => ({
            name: dirent.name,
            entityStores: path.join(
                config.STORE_PATH,
                dirent.name,
                ENTITYSTORES
            ),
        }));
    return feds;
}

async function folderExists(path) {
    const result = await fs.stat(path).catch((err) => {
        if (err.code === 'ENOENT') {
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

        return new Promise(async (resolve, reject) => {
            for (let i = 0; i < paths.length; i++) {
                let fedStore = paths[i];
                try {
                    let rawStores = await fs.readFile(fedStore.entityStores);
                    this.feds[fedStore.name] = JSON.parse(rawStores);
                } catch (err) {
                    log.error(`Unable to load store ${fedStore}`, err);
                    reject(err);
                }
            }
            resolve(this.feds);
        });
    }

    async load() {
        this.loading = true;
        return this.loadFromStore().then(() => (this.loading = false));
    }

    async store(fedName, entityStores) {
        // Not particularly secure
        const targetDir = path.join(config.STORE_PATH, fedName);
        const exists = await folderExists(targetDir);
        if (!exists) {
            await fs.mkdir(targetDir);
        }
        await fs.writeFile(
            path.join(targetDir, ENTITYSTORES),
            JSON.stringify(entityStores, null, 2)
        );
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
