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
        //data = { ...data, ...nodifyInstances(fed.entities) };
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

const GraphSource = ({ children }) => {
    const { settings } = useSettingsContext();
    const { fed, setFed } = useSetFed();
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
