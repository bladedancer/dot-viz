import StreamZip from 'node-stream-zip';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

const storeName = (storePath) => {
    var base = new String(storePath).substring(storePath.lastIndexOf('/') + 1);
    if (base.lastIndexOf('.') != -1)
        base = base.substring(0, base.lastIndexOf('.'));
    return base;
};

const process = async (fedName, fedPath) => {
    const zip = new StreamZip.async({ file: fedPath });

    const entries = await zip.entries();
    const entityStores = [];

    for (const entry of Object.values(entries)) {
        if (entry.isDirectory) {
            continue;
        }

        if (entry.name.startsWith('META-INF') || !entry.name.endsWith('.xml')) {
            // Skip the manifest for now - we'll assume a fed
            continue;
        }

        const entityStore = await processFile(zip, entry);
        entityStores.push(entityStore);
    }

    await zip.close();
    return entityStores;
};

const processFile = async (zip, entry) => {
    const data = await zip.entryData(entry);

    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: 'attributes',
    };
    const parser = new XMLParser(options);

    let obj = parser.parse(data);

    const store = {
        name: storeName(entry.name),
        entityTypes: [],
        entities: [],
    };

    if (obj.entityStoreData) {
        obj.entityStoreData.entityType.forEach((t) =>
            store.entityTypes.push(processEntityType(t))
        );

        obj.entityStoreData.entity.forEach((e) =>
            store.entities.push(processEntity(e))
        );
    }

    return store;
};

const processEntityType = (entityType) => {
    const type = {
        name: entityType.attributes.name,
        abstract: !!entityType.attributes.abstract,
        extends: entityType.attributes.extends,
        components: [],
        references: [],
        raw: entityType,
    };

    // Components
    const addComponent = (c) =>
        type.components.push({
            name: c.attributes.name,
            cardinality: c.attributes.cardinality || '*', // Not sure * is the default
        });

    if (entityType.componentType && Array.isArray(entityType.componentType)) {
        entityType.componentType.forEach((c) => addComponent);
    } else if (entityType.componentType) {
        // Single obj
        addComponent(entityType.componentType);
    }

    // Field References
    const addReference = (r) =>
        type.references.push({
            name: r.attributes.name,
            cardinality: r.attributes.cardinality || '*', // Not sure * is the default
            type: r.attributes.type.substring(1), // remove the ^/@
            hard: r.attributes.type.startsWith('@'),
            defaultRef: r.defaultRef || null,
        });

    if (entityType.field && Array.isArray(entityType.field)) {
        entityType.field
            .filter((f) => f.attributes.type.startsWith('^'))
            .forEach((c) => addComponent);
    } else if (
        entityType.field &&
        entityType.field.attributes.type.startsWith('^')
    ) {
        // Single obj
        addReference(entityType.field);
    }

    return type;
};

const processEntity = (entity) => {
    // TODO process the entities
};

export default process;
