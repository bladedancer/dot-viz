import React from 'react';
import { useStore } from '../store.jsx';

const RANKDIR_OPTIONS = [
    { value: 'LR', label: 'Left → Right' },
    { value: 'TB', label: 'Top → Bottom' },
    { value: 'RL', label: 'Right → Left' },
    { value: 'BT', label: 'Bottom → Top' },
];

const RANKER_OPTIONS = [
    { value: 'network-simplex', label: 'Network simplex' },
    { value: 'tight-tree',      label: 'Tight tree' },
    { value: 'longest-path',    label: 'Longest path' },
];

function SliderRow({ label, value, min, max, step, display, onChange }) {
    return (
        <div className="popover-row">
            <span className="popover-label">{label}</span>
            <input
                type="range"
                className="popover-slider"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="popover-value">{display ?? value}</span>
        </div>
    );
}

function CheckRow({ label, checked, onChange }) {
    return (
        <label className="popover-row" style={{ cursor: 'pointer' }}>
            <span className="popover-label">{label}</span>
            <input
                type="checkbox"
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </label>
    );
}

function SelectRow({ label, value, options, onChange }) {
    return (
        <div className="popover-row">
            <span className="popover-label">{label}</span>
            <select
                className="popover-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

export default function LayoutPopover({ mode }) {
    const { state, dispatch } = useStore();
    const { force, dagre } = state.layoutSettings;

    const setForce = (patch) => dispatch({ type: 'SET_LAYOUT_SETTINGS', force: patch });
    const setDagre = (patch) => dispatch({ type: 'SET_LAYOUT_SETTINGS', dagre: patch });

    return (
        <div className="layout-popover">
            {mode === 'force' ? (
                <>
                    <div className="popover-title">Force settings</div>
                    <SliderRow
                        label="Gravity"
                        value={force.gravity}
                        min={0} max={5} step={0.1}
                        onChange={(v) => setForce({ gravity: v })}
                    />
                    <SliderRow
                        label="Scaling"
                        value={force.scalingRatio}
                        min={1} max={500} step={1}
                        onChange={(v) => setForce({ scalingRatio: v })}
                    />
                    <SliderRow
                        label="Slow down"
                        value={force.slowDown ?? 1}
                        min={1} max={20} step={0.5}
                        display={force.slowDown == null ? 'auto' : force.slowDown}
                        onChange={(v) => setForce({ slowDown: v })}
                    />
                    {force.slowDown != null && (
                        <button className="popover-reset" onClick={() => setForce({ slowDown: null })}>
                            reset to auto
                        </button>
                    )}
                    <SliderRow
                        label="Timeout (s)"
                        value={force.timeoutMs / 1000}
                        min={5} max={60} step={5}
                        display={`${force.timeoutMs / 1000}s`}
                        onChange={(v) => setForce({ timeoutMs: v * 1000 })}
                    />
                    <CheckRow
                        label="LinLog mode"
                        checked={force.linLogMode}
                        onChange={(v) => setForce({ linLogMode: v })}
                    />
                    <CheckRow
                        label="Strong gravity"
                        checked={force.strongGravity}
                        onChange={(v) => setForce({ strongGravity: v })}
                    />
                </>
            ) : (
                <>
                    <div className="popover-title">Hierarchy settings</div>
                    <SelectRow
                        label="Direction"
                        value={dagre.rankdir}
                        options={RANKDIR_OPTIONS}
                        onChange={(v) => setDagre({ rankdir: v })}
                    />
                    <SliderRow
                        label="Node sep"
                        value={dagre.nodesep}
                        min={20} max={300} step={10}
                        onChange={(v) => setDagre({ nodesep: v })}
                    />
                    <SliderRow
                        label="Rank sep"
                        value={dagre.ranksep}
                        min={50} max={500} step={25}
                        onChange={(v) => setDagre({ ranksep: v })}
                    />
                    <SelectRow
                        label="Ranker"
                        value={dagre.ranker}
                        options={RANKER_OPTIONS}
                        onChange={(v) => setDagre({ ranker: v })}
                    />
                </>
            )}
        </div>
    );
}
