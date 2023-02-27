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

    const componentTypes = Array.isArray(entityType.componentType)
        ? entityType.componentType
        : [entityType.componentType];

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

    const fields = (
        Array.isArray(entityType.field) ? entityType.field : [entityType.field]
    ).filter(
        (f) =>
            f.attributes.type.startsWith('@') ||
            f.attributes.type.startsWith('^')
    );

    return fields.map((r) => ({
        source: entityType.attributes.name,
        target: r.attributes.type.substring(1),
        linkType: LINK_TYPE_REFERENCE,
        label: r.attributes.name,
        isHard: r.attributes.type.startsWith('@'),
        size: 1,
        type: 'arrow',
        color: chroma(col).alpha(0.5).hex(),
        weight: 5,
        cardinality: r.attributes.cardinality,
    }));
}

function linkEntityReferences(entity, col, allEntities, allEntityTypes) {
    // For the entire inheritance tree get the list of reference fields.
    let tree = [];
    for (
        let type = allEntityTypes[entity.attributes.type];
        type;
        type = allEntityTypes[type.attributes.extends]
    ) {
        tree.push(type);
    }

    let referenceFields = [];

    tree.forEach((entityType) => {
        if (!entityType.field) {
            return;
        }
        const fields = (
            Array.isArray(entityType.field)
                ? entityType.field
                : [entityType.field]
        )
            .filter(
                (f) =>
                    f.attributes.type.startsWith('@') ||
                    f.attributes.type.startsWith('^')
            )
            .map((f) => ({
                name: f.attributes.name,
                isHard: f.attributes.type.startsWith('@'),
                cardinality: f.attributes.cardinality,
                type: f.attributes.name,
            }));
        referenceFields = [...referenceFields, ...fields];
    });

    // Get an entity by it's parent, it's type, a field and value match
    const getEntityByField = (parent, type, field, value) => {
        const found = allEntities
            .filter((e) => e.parent === parent && e.type === type)
            .find((e) => {
                const fvals = Array.isArray(e.raw.fval)
                    ? e.raw.fval
                    : [e.raw.fval];
                return !!fvals.find(
                    (f) => f.attributes.name === field && f.value === value
                );
            });
        return found ? found.id : '-1';
    };

    // Get all the reference field values in the entity and create links
    let targetIds = [];
    const fvals = Array.isArray(entity.fval) ? entity.fval : [entity.fval];
    referenceFields.forEach((f) => {
        const fval = fvals.find((fval) => fval.attributes.name === f.name);

        if (!fval || !fval.value) {
            return;
        } else if (fval.value['#text']) {
            let id = '' + fval.value['#text'];
            id != '-1' && targetIds.push({ id, isHard: f.isHard });
        } else {
            const values = Array.isArray(fval.value)
                ? fval.value
                : [fval.value];

            values.forEach((value) => {
                let id = '-1';
                for (let key = value.key; !!key; key = key.key) {
                    if (Array.isArray(key.id)) {
                        console.error(
                            'Too lazy to figure out how to handle an array of ids.',
                            key
                        );
                        continue;
                    }

                    id = getEntityByField(
                        id,
                        key.attributes.type,
                        key.id.attributes.field,
                        key.id.attributes.value
                    );
                }
                if (id !== '-1') {
                    targetIds.push({ id, isHard: f.isHard });
                }
            });
        }
    });

    return targetIds.map((target) => ({
        source: entity.attributes.entityPK,
        target: target.id,
        linkType: LINK_TYPE_REFERENCE,
        isHard: target.isHard,
        size: 1,
        type: 'arrow',
        color: chroma(col).alpha(0.5).hex(),
        weight: 5,
        cardinality: '1',
    }));
}

const entityTypeHierachy = (stores) => {
    let entityTypeRoots = [];
    const children = {};
    stores.forEach((store) => {
        store.entityTypes.reduce((h, entityType) => {
            h[entityType.attributes.extends] = h[entityType.attributes.extends] || [];
            h[entityType.attributes.extends].push(entityType.attributes.name);
            return h;
        }, children);
    });

    // Build up a hierachy containing, children, parent, root.
    const process = (entityType, parent, root, col, depth = 0) => {
        if (!col) {
            col = {};
        }

        col[entityType] = {
            children: children[entityType],
            parent: parent,
            root
        };

        // Give nodes with a common root a common index.
        const isRoot = !root;
        col[entityType].rootIndex = 0;
        if (isRoot) {
            // Single nodes are just noise - just call them 0 and have done with it.
            if (col[entityType].children) {
                entityTypeRoots.push(entityType);
                col[entityType].rootIndex = entityTypeRoots.length;
            }
        } else {
            col[entityType].rootIndex = col[root].rootIndex;
        }
        
        // Recursive
        if (col[entityType].children) {
            if (entityType === 'Entity' || entityType === 'RootChild') {
                // Direct descendents of entity are roots.
                col[entityType].children.forEach(c => process(c, entityType, null, col));
            } else {
                col[entityType].children.forEach(c => process(c, entityType, isRoot ? entityType : root, col, depth++));
            }
        }
        return col;
    }

    return process("Entity");
}

const nodifyEntityType = (entityType, hierachy) => {
    const maxIndex = Object.keys(hierachy).reduce((i, et) => {
        if (hierachy[et].rootIndex > i) {
            i = hierachy[et].rootIndex;
        }
        return i;
    }, 0) + 1;

    const node = {
        id: entityType.attributes.name,
        group: hierachy[entityType.attributes.name].root || entityType.attributes.name,
        name: entityType.attributes.name,
        isRoot: !!hierachy[entityType.attributes.name].root,
        raw: entityType,
        links: [],
        color: color(hierachy[entityType.attributes.name].rootIndex, maxIndex),
        depth: hierachy[entityType.attributes.name].depth
    };

    node.links = [
        ...linkExtends(entityType, node.color),
        ...linkComponents(entityType, node.color),
        ...linkReferences(entityType, node.color),
    ];

    return node;
};

const nodifyEntity = (entity, store, stores) => {
    const allEntityTypes = stores
        .map((s) => s.entityTypes)
        .flatMap((e) => e)
        .reduce((acc, cur) => {
            acc[cur.attributes.name] = cur;
            return acc;
        }, {});

    const allEntities = stores.map((s) => s.entities).flatMap((e) => e);

    let fvals = [];
    if (entity.fval) {
        fvals = Array.isArray(entity.fval) ? entity.fval : [entity.fval];
    }

    const name = (e) => {
        const nameField = fvals.find((f) => f.attributes.name === 'name');
        return nameField
            ? `${('' + nameField.value).substring(0, 20)} (${
                  e.attributes.type
              })`
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
        depth: 1 // TODO...do entities have a depth??
    };

    node.links = [
        ...node.links,
        ...linkEntityParent(entity, node.color),
        ...linkEntityReferences(
            entity,
            node.color,
            allEntities,
            allEntityTypes
        ),
    ];
    return node;
};

const nodify = async (stores) => {
    let entityTypeNodes = [];
    let entityNodes = [];
    const hierachy = entityTypeHierachy(stores);

    stores.forEach((store) => {
        entityTypeNodes = [
            ...entityTypeNodes,
            store.entityTypes.map((et) => nodifyEntityType(et, hierachy)),
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
        entities: entityNodes,
    };
};

export default nodify;
