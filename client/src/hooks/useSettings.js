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
    const { setSettings } = useSettingsContext();
    return {
        setNodeData: (nodeData) =>
            setSettings(prev => ({ ...prev, nodeData, selection: [] })),
    };
}

export function useSetNodeFilter() {
    const { setSettings } = useSettingsContext();
    return {
        setNodeFilter: (nodeFilter) =>
            setSettings(prev => ({
                ...prev,
                nodeFilter: { ...prev.nodeFilter, ...nodeFilter },
            })),
    };
}

export function useSetEdgeFilter() {
    const { setSettings } = useSettingsContext();
    return {
        setEdgeFilter: (edgeFilter) =>
            setSettings(prev => ({
                ...prev,
                edgeFilter: { ...prev.edgeFilter, ...edgeFilter },
            })),
    };
}

export function useSetSelection() {
    const { setSettings } = useSettingsContext();
    return {
        setSelection: (selection) => setSettings(prev => ({ ...prev, selection })),
    };
}

export function useSetSource() {
    const { setSettings } = useSettingsContext();
    return {
        setSource: (source) => setSettings(prev => ({ ...prev, source })),
    };
}

export function useBumpLayoutTrigger() {
    const { setSettings } = useSettingsContext();
    return {
        bumpLayoutTrigger: () =>
            setSettings(prev => ({ ...prev, layoutTrigger: (prev.layoutTrigger || 0) + 1 })),
    };
}

export function useSetLoading() {
    const { setSettings } = useSettingsContext();
    return {
        setLoading: (loading) => setSettings(prev => ({ ...prev, loading })),
    };
}
