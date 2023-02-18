import * as zip from '@zip.js/zip.js';
import { XMLParser } from 'fast-xml-parser';

const storeName = (storePath) => {
    var base = new String(storePath).substring(storePath.lastIndexOf('/') + 1);
    if (base.lastIndexOf('.') != -1)
        base = base.substring(0, base.lastIndexOf('.'));
    return base;
};

const processFile = async (storeEntry) => {
    const fedTextWriter = new zip.TextWriter();
    const fedText = await storeEntry.getData(fedTextWriter);

    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: 'attributes',
        cdataPropName: '__cdata',
    };
    const parser = new XMLParser(options);

    let obj = parser.parse(fedText);

    const store = {
        name: storeName(storeEntry.filename),
        entityTypes: [],
        entities: [],
    };

    if (obj.entityStoreData) {
        obj.entityStoreData.entityType.forEach((t) =>
            store.entityTypes.push(t)
        );

        obj.entityStoreData.entity.forEach((e) => store.entities.push(e));
    }

    return store;
};

const loadFed = async (file) => {
    const fedReader = new zip.ZipReader(new zip.BlobReader(file));

    const xmlEntries = (await fedReader.getEntries()).filter((e) =>
        e.filename.endsWith('.xml')
    );

    const entityStores = [];
    for (let i = 0; i < xmlEntries.length; i++) {
        const entityStore = await processFile(xmlEntries[i]);
        entityStore && entityStores.push(entityStore);
    }

    await fedReader.close();
    return entityStores;
};

export default loadFed;
