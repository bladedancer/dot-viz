import React, { useCallback } from 'react';

import { FiZoomIn, FiZoomOut, FiCrosshair, FiMaximize } from 'react-icons/fi';
import { useCy } from '../../hooks/useCy';
import { useSettingsContext } from '../../hooks/useSettings.js';

const ZoomControl = ({ className, style, duration = 200, children }) => {
    const cy = useCy();
    const { settings } = useSettingsContext();

    const htmlProps = {
        style,
        className: `react-cy-control ${className || ''}`,
    };

    const zoomIn = useCallback(() => {
        cy.animate(
            {
                zoom: {
                    level: cy.zoom() * 1.2,
                    renderedPosition: {
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                    },
                },
            },
            {
                duration,
            }
        );
    }, [cy]);

    const zoomOut = useCallback(() => {
        cy.animate(
            {
                zoom: {
                    level: cy.zoom() * 0.8,
                    renderedPosition: {
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                    },
                },
            },
            {
                duration,
            }
        );
    }, [cy]);

    const fit = useCallback(() => {
        cy.animate(
            {
                fit: {
                    eles: cy.nodes(),
                },
            },
            {
                duration,
            }
        );
    }, [cy]);

    const fitsel = useCallback(() => {
        cy.animate(
            {
                fit: {
                    eles: cy.nodes(':selected'),
                },
            },
            {
                duration,
            }
        );
    }, [cy]);

    return (
        <>
            <div {...htmlProps}>
                <button onClick={zoomIn} title="Zoom In">
                    {children ? (
                        children[0]
                    ) : (
                        <FiZoomIn style={{ width: '1em' }} />
                    )}
                </button>
            </div>
            <div {...htmlProps}>
                <button onClick={zoomOut} title="Zoom Out">
                    {children ? (
                        children[1]
                    ) : (
                        <FiZoomOut style={{ width: '1em' }} />
                    )}
                </button>
            </div>
            <div {...htmlProps}>
                <button
                    onClick={fitsel}
                    title="Zoom to selection"
                    disabled={settings.selection.length === 0}
                >
                    {children ? (
                        children[2]
                    ) : (
                        <FiCrosshair style={{ width: '1em' }} />
                    )}
                </button>
            </div>
            <div {...htmlProps}>
                <button onClick={fit} title="See whole graph">
                    {children ? (
                        children[3]
                    ) : (
                        <FiMaximize style={{ width: '1em' }} />
                    )}
                </button>
            </div>
        </>
    );
};

export default ZoomControl;
