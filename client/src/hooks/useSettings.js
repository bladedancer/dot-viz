import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';

export const SettingsContext = createContext({
    settings: {},
    setSettings: () => {},
});

export const SettingsProvider = SettingsContext.Provider;

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (context == null) {
        throw new Error(
            'No context provided: useSettingsContext() can only be used in a descendant of <GraphContainer>'
        );
    }
    return context;
}

export function useSetNodeData() {
    const { settings, setSettings } = useSettingsContext();
    return {
        setNodeData: (nodeData) =>
            setSettings({ ...settings, nodeData, selection: [] }),
    };
}

export function useSetNodeFilter() {
    const { settings, setSettings } = useSettingsContext();
    return {
        setNodeFilter: (nodeFilter) =>
            setSettings({
                ...settings,
                nodeFilter: {
                    ...settings.nodeFilter,
                    ...nodeFilter,
                },
            }),
    };
}

export function useSetEdgeFilter() {
    const { settings, setSettings } = useSettingsContext();
    return {
        setEdgeFilter: (edgeFilter) =>
            setSettings({
                ...settings,
                edgeFilter: {
                    ...settings.edgeFilter,
                    ...edgeFilter,
                },
            }),
    };
}

export function useSetSelection() {
    const { settings, setSettings } = useSettingsContext();
    return {
        setSelection: (selection) => setSettings({ ...settings, selection }),
    };
}

export function useSetSource() {
    const { settings, setSettings } = useSettingsContext();
    return {
        setSource: (source) => setSettings({ ...settings, source }),
    };
}
