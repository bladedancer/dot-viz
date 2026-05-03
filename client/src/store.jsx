import { createContext, useContext, useReducer, useMemo } from 'react';

const initialState = {
    graph: { groups: [], artifacts: [] },
    graphVersion: 0,
    source: 'artifacts',
    loading: false,
    nodeFilter: { text: '', connected: false, direction: 'both' },
    edgeFilter: { compile: true, provided: true, test: false, grouping: true },
    selection: [],
    layoutSettings: {
        force: {
            gravity:       1,
            scalingRatio:  10,
            slowDown:      null,
            timeoutMs:     15000,
            linLogMode:      false,
            strongGravity:   false,
            noverlapMargin:  4,
            groupRepulsion:  100,
        },
        dagre: {
            rankdir: 'LR',
            nodesep: 80,
            ranksep: 200,
            ranker:  'network-simplex',
        },
    },
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_GRAPH':
            return { ...state, graph: action.graph, graphVersion: state.graphVersion + 1 };
        case 'SET_SOURCE':
            return { ...state, source: action.source };
        case 'SET_LOADING':
            return { ...state, loading: action.loading };
        case 'SET_NODE_FILTER':
            return { ...state, nodeFilter: { ...state.nodeFilter, ...action.nodeFilter } };
        case 'SET_EDGE_FILTER':
            return { ...state, edgeFilter: { ...state.edgeFilter, ...action.edgeFilter } };
        case 'SET_SELECTION':
            return { ...state, selection: action.selection };
        case 'SET_LAYOUT_SETTINGS':
            return {
                ...state,
                layoutSettings: {
                    force: { ...state.layoutSettings.force, ...(action.force || {}) },
                    dagre: { ...state.layoutSettings.dagre, ...(action.dagre || {}) },
                },
            };
        default:
            return state;
    }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = useMemo(() => ({ state, dispatch }), [state]);
    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
}
