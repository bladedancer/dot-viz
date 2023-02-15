import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSetFeds } from '../../hooks/useSettings.js';
import SlideToggle from '../utils/SlideToggle.jsx';
import Select, { components } from 'react-select';
import './sourcecontrol.css';
import FedControl from './FedControl.jsx';

const SourceControl = () => {
    const selectRef = useRef(null);
    const { feds } = useSetFeds();
    const [fedState, setFedState] = useState();
    const [selectedOption, setSelectedOption] = useState(null);
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(
        () => setFedState(feds().map((f, i) => ({ id: i, label: f }))),
        [feds()]
    );

    return (
        <>
            <div className="react-cy-control source-control">
                <div>
                    <Select
                        ref={selectRef}
                        className="source-select"
                        options={fedState}
                        onChange={setSelectedOption}
                        value={selectedOption}
                        placeholder="Select FED"
                        isSearchable
                        isClearable
                    />
                </div>
                <FedControl />
                <SlideToggle
                    className="source-toggle"
                    selected="entityTypes"
                    onChange={() => {}}
                    options={[
                        {
                            value: 'entityTypes',
                            label: 'Entitiy Types',
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
