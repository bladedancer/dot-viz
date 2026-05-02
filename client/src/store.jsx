import { createContext, useContext, useReducer, useMemo } from 'react';

const initialState = {
    graph: { groups: [], artifacts: [] },
    graphVersion: 0,
    source: 'artifacts',
    loading: false,
    nodeFilter: { text: '', connected: false, direction: 'both' },
    edgeFilter: { compile: true, provided: true, test: false, grouping: true },
    selection: [],
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
