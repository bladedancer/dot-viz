import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import LayoutPopover from './LayoutPopover.jsx';

const Toolbar = () => {
    const { state, dispatch } = useStore();
    const [layoutMode, setLayoutMode] = useState('force');
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        const handler = (e) => setLayoutMode(e.detail);
        window.addEventListener('sigma:layout-mode-changed', handler);
        return () => window.removeEventListener('sigma:layout-mode-changed', handler);
    }, []);

    const rerun  = () => window.dispatchEvent(new Event('sigma:rerun-layout'));
    const fitAll = () => window.dispatchEvent(new Event('sigma:fit-all'));
    const fitSel = () => window.dispatchEvent(new CustomEvent('sigma:fit-selection', { detail: state.selection }));
    const zoomIn  = () => window.dispatchEvent(new CustomEvent('sigma:zoom', { detail: 1.3 }));
    const zoomOut = () => window.dispatchEvent(new CustomEvent('sigma:zoom', { detail: 1 / 1.3 }));

    const setMode = (mode) => {
        window.dispatchEvent(new CustomEvent('sigma:set-layout-mode', { detail: mode }));
        setLayoutMode(mode);
    };

    const handleForceBtn = () => {
        if (layoutMode === 'force') {
            setSettingsOpen((o) => !o);
        } else {
            setMode('force');
            setSettingsOpen(false);
        }
    };

    const handleHierarchyBtn = () => {
        if (layoutMode === 'hierarchy') {
            setSettingsOpen((o) => !o);
        } else {
            setMode('hierarchy');
            setSettingsOpen(false);
        }
    };

    const handleClose = useCallback(() => setSettingsOpen(false), []);

    const setSource = (s) => dispatch({ type: 'SET_SOURCE', source: s });
    const hasSelection = state.selection.length > 0;

    return (
        <div className="toolbar" style={{ position: 'relative' }}>
            {settingsOpen && (
                <LayoutPopover
                    mode={layoutMode}
                    onClose={handleClose}
                />
            )}
            <button className="tool-btn" title="Zoom in"       onClick={zoomIn}>+</button>
            <button className="tool-btn" title="Zoom out"      onClick={zoomOut}>−</button>
            <button className="tool-btn" title="Fit graph"     onClick={fitAll}>⊡</button>
            <button className="tool-btn" title="Fit selection" onClick={fitSel} disabled={!hasSelection}>⊙</button>
            <div className="toolbar-sep" />
            <button
                className={`tool-btn${layoutMode === 'force' ? ' active' : ''}`}
                title="Force layout (FA2) — click to toggle settings"
                onClick={handleForceBtn}
            >⊛</button>
            <button
                className={`tool-btn${layoutMode === 'hierarchy' ? ' active' : ''}`}
                title="Hierarchy layout (Dagre) — click to toggle settings"
                onClick={handleHierarchyBtn}
            >⊞</button>
            <button className="tool-btn" title="Re-run layout" onClick={rerun}>⟳</button>
            <div className="toolbar-sep" />
            <button
                className={`tool-btn${state.source === 'artifacts' ? ' active' : ''}`}
                title="Show artifacts"
                onClick={() => setSource('artifacts')}
            >A</button>
            <button
                className={`tool-btn${state.source === 'groups' ? ' active' : ''}`}
                title="Show groups"
                onClick={() => setSource('groups')}
            >G</button>
        </div>
    );
};

export default Toolbar;
