import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const SettingsContext = createContext({
    settings: {},
    setSettings: () => {}
});

export const SettingsProvider = SettingsContext.Provider;

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (context == null) {
        throw new Error("No context provided: useSettingsContext() can only be used in a descendant of <GraphContainer>");
    }
    return context;
}

export function useSetSelection() {
    const { settings, setSettings } = useSettingsContext();
    const get = useCallback(() => settings.selection, [settings]);

    return {
        selection: get,
        setSelection: (selection) => setSettings({...settings, selection})
    };
}

export function useSetContentModifiedTS() {
    const { settings, setSettings } = useSettingsContext();
    const get = useCallback(() => settings.contentModifiedTS, [settings]);

    return {
        contentModifiedTS: get,
        setContentModifiedTS: (contentModifiedTS) => setSettings({...settings, contentModifiedTS})
    };
}

export function useSetSourceRefresh() {
    const { settings, setSettings } = useSettingsContext();
    const get = useCallback(() => settings.sourceRefresh, [settings]);

    return {
        sourceRefresh: get,
        setSourceRefresh: (sourceRefresh) => setSettings({...settings, sourceRefresh: { ...sourceRefresh, busy: true, ts: Date.now() }}),
        setSourceRefreshBusy: (busy) => setSettings({
            ...settings,
            sourceRefresh: {
                ...settings.sourceRefresh,
                busy
            }}),
    };
}


export function useSetSource() {
    const { settings, setSettings } = useSettingsContext();
    const getSource = useCallback(() => settings.source, [settings]);

    return {
        source: getSource,
        setSource: (source) => setSettings({...settings, source, selection: []})
    };
}

export function useSetNodeFilter() {
    const { settings, setSettings } = useSettingsContext();
    const getNodeFilter = useCallback(() => settings.nodes, [settings]);

    return {
        nodeFilter: getNodeFilter,
        setNodeFilter: (nodeFilter) => setSettings({
            ...settings,
            nodes: {
                ...settings.nodes,
                ...nodeFilter
            }
        })
    };
}

export function useSetEdgeFilter() {
    const { settings, setSettings } = useSettingsContext();
    const getEdgeFilter = useCallback(() => settings.edges, [settings]);

    return {
        edgeFilter: getEdgeFilter,
        setEdgeFilter: (edgeFilter) => setSettings({
            ...settings,
            edges: {
                ...settings.edges,
                ...edgeFilter
            }
        })
    };
}
