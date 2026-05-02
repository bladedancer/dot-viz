import React from 'react';
import { StoreProvider, useStore } from './store.jsx';
import Viewer from './graph/Viewer.jsx';
import PomPanel from './panels/PomPanel.jsx';
import FilterPanel from './panels/FilterPanel.jsx';
import Toolbar from './panels/Toolbar.jsx';
import './theme.css';

function AppInner() {
    const { state } = useStore();
    const { source, graph, loading } = state;
    const nodeData = graph[source] || [];

    return (
        <div className="app">
            <Viewer nodeData={nodeData} loading={loading} />

            <div className="overlay top-left">
                <PomPanel />
                <FilterPanel />
            </div>

            <div className="overlay bottom-right">
                <Toolbar />
            </div>
        </div>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <AppInner />
        </StoreProvider>
    );
}
