import { createContext, useContext, useState } from 'react';

const CytoscapeContext = createContext(null);

export const CytoscapeProvider = CytoscapeContext.Provider;

export function useCy() {
    return useContext(CytoscapeContext);
}

export function useCyState() {
    return useState(null);
}
