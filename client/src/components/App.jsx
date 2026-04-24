import React, { useState, useMemo, useCallback } from 'react';
import { SettingsProvider } from '../hooks/useSettings.js';
import { CytoscapeProvider, useCyState } from '../hooks/useCy.js';
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
        layoutTrigger: 0,
        loading: false,
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
            test: true,
            grouping: true,
        },
    });
    const [cy, setCy] = useCyState();

    const settingsContext = useMemo(() => ({ settings, setSettings }), [settings]);
    const handleCyInit = useCallback((instance) => setCy(instance), [setCy]);

    return (
        <SettingsProvider value={settingsContext}>
            <CytoscapeProvider value={cy}>
                <Graph onCyInit={handleCyInit} />
                <ControlsContainer position={'top-left'}>
                    <DotControl />
                    <SourceControl />
                    <FilterControl />
                    <ExportControl />
                </ControlsContainer>
                <ControlsContainer position={'bottom-right'}>
                    <ZoomControl />
                    <LayoutControl layoutTrigger={settings.layoutTrigger} />
                </ControlsContainer>
            </CytoscapeProvider>
        </SettingsProvider>
    );
};

export default App;
