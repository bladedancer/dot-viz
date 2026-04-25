import { createContext, useContext } from 'react';

export const CyContext = createContext(null);

export function useCy() {
    return useContext(CyContext);
}
