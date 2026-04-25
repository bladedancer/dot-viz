import React, {
    useCallback,
    useEffect,
    useState,
    useMemo,
    useRef,
} from 'react';
import { FiGrid, FiPlay, FiPause, FiSettings } from 'react-icons/fi';
import Form from '@rjsf/core';
import { useCy } from '../../hooks/useCy';
import Button from '../utils/Button.jsx';
import supportedLayouts from '../../layouts/index.js';

const LayoutControl = ({ className, style, children }) => {
    const cy = useCy();
    const [opened, setOpened] = useState(false);
    const [layoutConfigOpened, setLayoutConfigOpened] = useState(false);
    const [layoutOverrides, setLayoutOverrides] = useState({});
    const [layout, setLayout] = useState('breadthfirst');
    const [activeLayout, setActiveLayout] = useState();
    const isMounted = useRef(false);

    // Common html props for the div wrapper
    const htmlProps = {
        style,
        className: `react-cy-control ${className || ''}`,
    };

    const layouts = useMemo(() =>
        Object.fromEntries(
            Object.entries(supportedLayouts).map(([k, v]) => [
                k,
                layoutOverrides[k] ? { ...v, ...layoutOverrides[k] } : v,
            ])
        ),
    [layoutOverrides]);

    const runLayout = useCallback(async () => {
        if (activeLayout) {
            activeLayout.stop();
            await activeLayout.pon('layoutstop'); // Think there's a race wiith the disable effect.
        }

        let lay = cy.elements(':visible').layout(layouts[layout]);
        if (lay.options.animate) {
            setActiveLayout(lay);
        } else {
            setActiveLayout(null);
        }

        lay.run();
    }, [cy, layout, activeLayout, setActiveLayout]);

    const stopLayout = useCallback(() => {
        activeLayout && activeLayout.stop();
        setActiveLayout(null);
    }, [cy, activeLayout, setActiveLayout]);

    // Update layout on change
    useEffect(async () => {
        if (!cy) {
            return;
        }
        stopLayout();
        runLayout();
    }, [cy, layout]);

    // Disable stop button when layout auto-stops
    useEffect(async () => {
        if (!activeLayout) {
            return;
        }
        await activeLayout.pon('layoutstop');
        activeLayout.stop(); // Explicitly stop it anyway
        setActiveLayout(null);
    }, [activeLayout, setActiveLayout]);

    // When the overrides change rerun layout
    useEffect(async () => {
        if (isMounted.current) {
            runLayout();
        } else {
            isMounted.current = true;
        }
    }, [layoutConfigOpened, layoutOverrides]);

    return (
        <>
            <div {...htmlProps}>
                <button
                    onClick={() => {
                        setOpened(!opened);
                        setLayoutConfigOpened(false);
                    }}
                    title="Select layout"
                >
                    <FiGrid />
                </button>
                {opened === true && (
                    <ul
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: '35px',
                            margin: 0,
                            padding: 0,
                            listStyle: 'none',
                        }}
                    >
                        {Object.keys(layouts).map((name) => {
                            const hasSchema = !!layouts[layout].schema;
                            return (
                                <li key={name} className="layout-option">
                                    <Button
                                        title={name}
                                        active={layout === name}
                                        action={() => {
                                            setLayout(name);
                                            setOpened(false);
                                            setLayoutConfigOpened(false);
                                        }}
                                        altIcon={hasSchema && <FiSettings />}
                                        altEnabled={hasSchema && layout === name}
                                        altAction={
                                            hasSchema &&
                                            (() => {
                                                setLayoutConfigOpened(true);
                                                setOpened(false);
                                            })
                                        }
                                    />
                                </li>
                            );
                        })}
                    </ul>
                )}
                {layoutConfigOpened === true && (
                    <div className="layout-config">
                        <Form
                            schema={layouts[layout].schema}
                            formData={layouts[layout]}
                            uiSchema={{
                                'ui:submitButtonOptions': { norender: true },
                            }}
                            onChange={({ formData }, e) => {
                                setLayoutOverrides({
                                    [layout]: formData,
                                });
                            }}
                        />
                    </div>
                )}
            </div>
            <div {...htmlProps}>
                <button
                    onClick={() => runLayout()}
                    title="Re-run layout"
                    disabled={activeLayout}
                >
                    <FiPlay />
                </button>
            </div>
            <div {...htmlProps}>
                <button
                    onClick={() => stopLayout()}
                    title="Stop layout"
                    disabled={!activeLayout || !activeLayout.options.animate}
                >
                    <FiPause />
                </button>
            </div>
        </>
    );
};
export default LayoutControl;
