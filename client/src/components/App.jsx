import React, { useState, useEffect, useMemo } from 'react';
import { SettingsProvider } from '../hooks/useSettings.js';
import ControlsContainer from './controls/ControlsContainer.jsx';
import ExportControl from './controls/ExportControl.jsx';
import FedControl from './controls/FedControl.jsx';
import FilterControl from './controls/FilterControl.jsx';
import LayoutControl from './controls/LayoutControl.jsx';
import SourceControl from './controls/SourceControl.jsx';
import ZoomControl from './controls/ZoomControl.jsx';
import Graph from './Graph.jsx';
import GraphSource from './GraphSource.jsx';

const App = () => {
    const [settings, setSettings] = useState({
        contentModifiedTS: 0,
        fed: null,
        source: 'entityTypes',
        selection: [],

        graphData: {
            source: '',
            nodes: []
        },

        nodes: {
            filter: '',
            connected: false,
            direction: 'both',
        },
        edges: {
            extends: true,
            component: true,
            referenceHard: true,
            referenceSoft: true,
        },
    });
    const context = useMemo(() => ({ settings, setSettings }), [settings]);

    return (
        <SettingsProvider value={context}>
            <GraphSource />
            <Graph />
            
            <ControlsContainer position={'top-left'}>
                <FedControl />
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
