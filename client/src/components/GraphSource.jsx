import React, { useEffect } from 'react';
import chroma from 'chroma-js';
import {
    useSetFed,
    useSetGraphData,
    useSettingsContext,
} from '../hooks/useSettings.js';

const LINK_TYPE_EXTENDS = 'extends';
const LINK_TYPE_COMPONENT = 'component';
const LINK_TYPE_REFERENCE = 'reference';

function color(index, domain) {
    return chroma(chroma.scale('Spectral').colors(domain)[index])
        .darken()
        .hex();
}

function nodify(fed, source) {
    let data = {
        source,
        nodes: [],
    };

    if (source === 'entityTypes') {
        data = { ...data, ...nodifyEntityTypes(fed) };
    } else if (source === 'entities') {
        data = { ...data, ...nodifyEntities(fed) };
    }

    return data;
}

function linkExtends(n) {
    if (n.extends === 'Entity') {
        return [];
    }

    return [
        {
            source: n.id,
            target: n.extends,
            linkType: LINK_TYPE_EXTENDS,
            size: 1,
            type: 'line',
            color: chroma(n.color).alpha(0.5).hex(),
            weight: 10,
            cardinality: '1',
        },
    ];
}

function linkComponents(n) {
    return n.components.map((c) => ({
        source: n.id,
        target: c.name,
        linkType: LINK_TYPE_COMPONENT,
        size: 1,
        type: 'arrow',
        color: chroma(n.color).alpha(0.5).hex(),
        weight: 5,
        cardinality: c.cardinality,
    }));
}

function linkReferences(n) {
    return n.references.map((r) => ({
        source: n.id,
        target: r.type,
        linkType: LINK_TYPE_REFERENCE,
        isHard: r.hard,
        size: 1,
        type: 'arrow',
        color: chroma(n.color).alpha(0.5).hex(),
        weight: 5,
        cardinality: r.cardinality,
    }));
}

function nodifyEntityTypes(fed) {
    let nodes = [];
    for (let i = 0; i < fed.length; i++) {
        if (!fed[i].entityTypes.length) {
            continue;
        }

        nodes = [
            ...nodes,
            ...fed[i].entityTypes.map((entityType) => {
                return {
                    id: entityType.name,
                    group: fed[i].name,
                    name: entityType.name,
                    abstract: entityType.abstract,
                    extends: entityType.extends,
                    components: entityType.components,
                    references: entityType.references,
                    isRoot: entityType.extends === 'Entity',
                    raw: entityType.raw,
                    links: [],
                    color: color(i, fed.length),
                };
            }),
        ];
    }

    // Node Links: Extends
    nodes.forEach((n) => {
        n.links = [
            ...n.links,
            ...linkExtends(n),
            ...linkComponents(n),
            ...linkReferences(n),
        ];
    });

    return { nodes };
}

function linkEntityParent(n) {
    if (!n.parent) {
        return [];
    }

    return [
        {
            source: n.id,
            target: n.parent,
            linkType: LINK_TYPE_COMPONENT,
            size: 1,
            type: 'line',
            color: chroma(n.color).alpha(0.5).hex(),
            weight: 10,
            cardinality: '1',
        },
    ];
}

function linkEntityReferences(e, allEntities) {
    if (!e.references) {
        return [];
    }

    const links = [];

    Object.keys(e.references).forEach((r) => {
        const reference = e.references[r];
        const fval = (
            Array.isArray(e.raw.fval) ? e.raw.fval : [e.raw.fval]
        ).find((f) => f.attributes.name === r);

        if (!fval || !fval.value) {
            return;
        }

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

        let targetIds = [];

        if (fval.value['#text']) {
            targetIds.push('' + fval.value['#text']);
        } else {
            const values = Array.isArray(fval.value)
                ? fval.value
                : [fval.value];

            values.forEach((value) => {
                let id = '0';
                for (let key = value.key; !!key; key = key.key) {
                    if(Array.isArray(key.id)) {
                        console.error("Too lazy to figure out how to handle an array of ids.", key);
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
                    targetIds.push(id);
                }
            });
        }

        targetIds.forEach((targetId) =>
            links.push({
                source: e.id,
                target: targetId,
                linkType: LINK_TYPE_REFERENCE,
                isHard: reference.isHard,
                size: 1,
                type: 'arrow',
                color: chroma(e.color).alpha(0.5).hex(),
                weight: 5,
                cardinality: reference.cardinality,
            })
        );
    });
    return links;
}

function nodifyEntities(fed) {
    let nodes = [];

    const name = (e) => {
        const nameField = e.fields.find((f) => f.attributes.name === 'name');
        return nameField
            ? `${('' + nameField.value).substring(0, 20)} (${e.type})`
            : e.type;
    };

    const allEntities = fed.flatMap((f) => f.entities);

    for (let i = 0; i < fed.length; i++) {
        if (!fed[i].entities.length) {
            continue;
        }

        nodes = [
            ...nodes,
            ...fed[i].entities
                .filter((e) => e.name !== 'Root')
                .map((entity) => {
                    return {
                        id: entity.id,
                        group: fed[i].name,
                        name: name(entity),
                        parent: entity.parent,
                        isRoot: !entity.parent,
                        type: entity.type,
                        raw: entity.raw,
                        references: entity.references,
                        links: [],
                        color: color(i, fed.length),
                    };
                }),
        ];
    }

    // // Node Links: Extends
    nodes.forEach((n) => {
        n.links = [
            ...n.links,
            ...linkEntityParent(n),
            ...linkEntityReferences(n, allEntities),
        ];
    });

    return { nodes };
}

const GraphSource = ({ children }) => {
    const { settings } = useSettingsContext();
    const { setGraphData } = useSetGraphData();

    useEffect(async () => {
        if (!settings.fed) {
            return;
        }
        setGraphData(nodify(settings.fed, settings.source));
    }, [settings.fed, settings.source]);

    return <>{children}</>;
};

export default GraphSource;
