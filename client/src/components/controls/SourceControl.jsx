import React from 'react';
import { useSetSource, useSettingsContext  } from '../../hooks/useSettings.js';
import SlideToggle from '../utils/SlideToggle.jsx';
import './sourcecontrol.css';

const SourceControl = () => {
    const { settings } = useSettingsContext();
    const { setSource } = useSetSource();
    return (
        <>
            <div className="react-cy-control source-control">
                <SlideToggle
                    className="source-toggle"
                    selected={settings.source}
                    onChange={setSource}
                    options={[
                        {
                            value: 'entityTypes',
                            label: 'Entity Types',
                        },
                        {
                            value: 'entities',
                            label: 'Entities',
                        },
                    ]}
                />
            </div>
        </>
    );
};

export default SourceControl;
