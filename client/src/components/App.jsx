import React, { useState, useEffect, useMemo } from 'react';
import { SettingsProvider } from '../hooks/useSettings.js';
import ControlsContainer from './controls/ControlsContainer.jsx';
import ExportControl from './controls/ExportControl.jsx';
import DotControl from './controls/DotControl.jsx';
import FilterControl from './controls/FilterControl.jsx';
import LayoutControl from './controls/LayoutControl.jsx';
import SourceControl from './controls/SourceControl.jsx';
import ZoomControl from './controls/ZoomControl.jsx';
import Graph from './Graph.jsx';

const App = () => {
    const [settings, setSettings] = useState({
        contentModifiedTS: 0,
        fed: null,
        source: 'artifacts',
        selection: [],

        nodeData: {
            groups: [],
            artifacts: [],
        },

        nodeFilter: {
            filter: '',
            connected: false,
            direction: 'both',
        },
        edgeFilter: {
            compile: true,
            provided: true,
        },
    });
    const context = useMemo(() => ({ settings, setSettings }), [settings]);

    return (
        <SettingsProvider value={context}>
            <Graph />

            <ControlsContainer position={'top-left'}>
                <DotControl />
                <SourceControl />
                <FilterControl />
                <ExportControl />
            </ControlsContainer>
            <ControlsContainer position={'bottom-right'}>
                <ZoomControl />
                <LayoutControl />
            </ControlsContainer>
        </SettingsProvider>
    );
};

export default App;
