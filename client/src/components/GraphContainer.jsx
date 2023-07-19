import React, { useState, useEffect, useMemo } from 'react';
import { SettingsProvider } from '../hooks/useSettings.js';

const GraphContainer = ({ children }) => {
    const [settings, setSettings] = useState({
        contentModifiedTS: 0,
        source: 'artifacts',
        selection: [],
        sourceRefresh: {
            busy: false,
            source: '',
            ts: 0,
        },
        nodes: {
            filter: '',
            connected: false,
            direction: 'both',
        },
        edges: {
            compile: true,
            provided: true,
        },
    });
    const context = useMemo(() => ({ settings, setSettings }), [settings]);

    return (
        <div>
            <SettingsProvider value={context}>{children}</SettingsProvider>
        </div>
    );
};

export default GraphContainer;
