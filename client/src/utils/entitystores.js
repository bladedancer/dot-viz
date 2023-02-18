import chroma from 'chroma-js';

const LINK_TYPE_EXTENDS = 'extends';
const LINK_TYPE_COMPONENT = 'component';
const LINK_TYPE_REFERENCE = 'reference';

function color(index, domain) {
    return chroma(chroma.scale('Spectral').colors(domain)[index])
        .darken()
        .hex();
}

function linkExtends(entityType, col) {
    if (entityType.attributes.extends === 'Entity') {
        return [];
    }

    return [
        {
            source: entityType.attributes.name,
            target: entityType.attributes.extends,
            linkType: LINK_TYPE_EXTENDS,
            size: 1,
            type: 'line',
            color: chroma(col).alpha(0.5).hex(),
            weight: 10,
            cardinality: '1',
        },
    ];
}

function linkComponents(entityType, col) {
    if (!entityType.componentType) {
        return [];
    }

    const componentTypes = Array.isArray(entityType.componentType) ? entityType.componentType : [entityType.componentType];

    return componentTypes.map((c) => ({
        source: entityType.attributes.name,
        target: c.attributes.name,
        linkType: LINK_TYPE_COMPONENT,
        size: 1,
        type: 'arrow',
        color: chroma(col).alpha(0.5).hex(),
        weight: 5,
        cardinality: c.attributes.cardinality,
    }));
}

function linkEntityParent(entity, col) {
    if (entity.attributes.parentPK === '0') {
        return [];
    }

    return [
        {
            source: entity.attributes.entityPK,
            target: entity.attributes.parentPK,
            linkType: LINK_TYPE_COMPONENT,
            size: 1,
            type: 'line',
            color: chroma(col).alpha(0.5).hex(),
            weight: 5,
            cardinality: '1',
        },
    ];
}

function linkReferences(entityType, col) {
    if (!entityType.field) {
        return [];
    }

    const fields = (Array.isArray(entityType.field) ? entityType.field : [entityType.field])
        .filter(f => f.attributes.type.startsWith('@') || f.attributes.type.startsWith('^'));

    return fields.map((r) => ({
        source: entityType.attributes.name,
        target: r.attributes.type.substring(1),
        linkType: LINK_TYPE_REFERENCE,
        isHard: r.attributes.type.startsWith('@'),
        size: 1,
        type: 'arrow',
        color: chroma(col).alpha(0.5).hex(),
        weight: 5,
        cardinality: r.attributes.cardinality,
    }));
}


const nodifyEntityType = (entityType, store, stores) => {
    const node = {
        id: entityType.attributes.name,
        group: store.name,
        name: entityType.attributes.name,
        isRoot: entityType.attributes.extends === 'Entity',
        raw: entityType,
        links: [],
        color: color(stores.indexOf(store), stores.length),
    };

    node.links = [
        ...linkExtends(entityType, node.color),
        ...linkComponents(entityType, node.color),
        ...linkReferences(entityType, node.color)
    ]

    return node;
};

const nodifyEntity = (entity, store, stores) => {
    let fvals = [];
    if (entity.fval) {
        fvals = (Array.isArray(entity.fval) ? entity.fval : [entity.fval]);
    }

    const name = (e) => {
        const nameField = fvals.find((f) => f.attributes.name === 'name');
        return nameField
            ? `${('' + nameField.value).substring(0, 20)} (${e.attributes.type})`
            : e.attributes.type;
    };

    const node = {
        id: entity.attributes.entityPK,
        group: store.name,
        name: name(entity),
        isRoot: entity.attributes.parentPK === '0',
        raw: entity,
        links: [],
        color: color(stores.indexOf(store), stores.length),
    };

    node.links = [
        ...node.links,
        ...linkEntityParent(entity, node.color)
        // n.links = [
        //     ...n.links,
        //     ...linkEntityParent(n),
        //     ...linkEntityReferences(n, allEntities),
        ];
    return node;
}

const nodify = async (stores) => {
    let entityTypeNodes = [];
    let entityNodes = [];

    stores.forEach((store) => {
        entityTypeNodes = [
            ...entityTypeNodes,
            store.entityTypes.map((et) => nodifyEntityType(et, store, stores)),
        ];

        entityNodes = [
            ...entityNodes,
            store.entities.map((e) => nodifyEntity(e, store, stores)),
        ];

    });

    entityTypeNodes = entityTypeNodes.flatMap((f) => f);
    entityNodes = entityNodes.flatMap((f) => f);

    return {
        entityTypes: entityTypeNodes,
        entities: entityNodes
    };
};

export default nodify;
