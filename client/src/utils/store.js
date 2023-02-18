import * as zip from "@zip.js/zip.js";
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
            store.entityTypes.push(processEntityType(t))
        );

        obj.entityStoreData.entity.forEach((e) =>
            store.entities.push(processEntity(
                obj.entityStoreData.entityType.find(et => et.attributes.name === e.attributes.type),
                e))
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
        entityType.componentType.forEach((c) => addComponent(c));
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
            .filter((f) => f.attributes.type.startsWith('^') || f.attributes.type.startsWith('@'))
            .forEach((f) => addReference(f));
    } else if (
        entityType.field &&
        (entityType.field.attributes.type.startsWith('^') || entityType.field.attributes.type.startsWith('@'))
    ) {
        // Single obj
        addReference(entityType.field);
    }

    return type;
};

const processEntity = (entityType, entity) => {
    let references = {};

    if (entityType.field) {
        const typeFields = Array.isArray(entityType.field) ? entityType.field : [entityType.field];
        const referenceFields = typeFields.filter(f => f.attributes.type.startsWith('^') || f.attributes.type.startsWith('@')); 
        references = referenceFields.reduce((acc, cur) => {
            acc[cur.attributes.name] = {
                isHard: cur.attributes.type.startsWith('@'),
                type: cur.attributes.type.substring(1),
                cardinality: cur.attributes.cardinality || '*', // Not sure * is the default
            };
            return acc;
        }, references);
    }

    const entityData = {
        id: entity.attributes.entityPK,
        parent: entity.attributes.parentPK,
        type: entity.attributes.type,
        fields: Array.isArray(entity.fval) ? entity.fval : [entity.fval],
        references,
        raw: entity,
    };

    return entityData;
};

const process = async (file) => {
    const fedReader = new zip.ZipReader(new zip.BlobReader(file));

    const xmlEntries = (await fedReader.getEntries()).filter((e) => 
        e.filename.endsWith(".xml")
    );

    const entityStores = [];
    for (let i = 0; i < xmlEntries.length; i++) {
        const entityStore = await processFile(xmlEntries[i]);
        entityStore && entityStores.push(entityStore);
    }

    await fedReader.close()
    return entityStores;
}

export default process;
