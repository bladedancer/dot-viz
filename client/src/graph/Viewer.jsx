import React from 'react';
import { SigmaContainer } from '@react-sigma/core';
import RoundedRectProgram from './nodeProgram.js';
import { LABEL_FONT } from './buildGraph.js';
import { GraphLoader, GraphEffects } from './GraphEffects.jsx';

const sigmaSettings = {
    nodeProgramClasses:      { rounded: RoundedRectProgram },
    nodeHoverProgramClasses: { rounded: RoundedRectProgram },
    defaultNodeType:  'rounded',
    labelFont:        LABEL_FONT,
    labelColor:       { color: '#c9d1d9' },
    labelSize:        12,
    labelWeight:      '400',
    minCameraRatio:   0.05,
    maxCameraRatio:   10,
    renderEdgeLabels: false,
    defaultEdgeColor: '#555',
    defaultEdgeType:  'arrow',
    hideEdgesOnMove:  true,
    hideLabelsOnMove: false,
    allowInvalidContainer: true,
};

export default function Viewer({ nodeData, loading }) {
    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <SigmaContainer settings={sigmaSettings} style={{ width: '100%', height: '100%' }}>
                <GraphLoader nodeData={nodeData} />
                <GraphEffects />
            </SigmaContainer>
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                </div>
            )}
        </div>
    );
}
