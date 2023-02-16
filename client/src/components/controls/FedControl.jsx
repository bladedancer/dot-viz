import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import process from '../../utils/store';
import './fedcontrol.css';

const FedControl = ({}) => {
    const fedFile = useRef();
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const processFile = useCallback(async () => {
        setBusy(true);
        const store = await process(selectedFile);
        console.log('store', store);
        setBusy(false);
    }, [selectedFile, setBusy]);

    const clearSelection = useCallback(async () => {
        console.log('CLEARING');
        setSelectedFile(null);
        fedFile.current.value = '';
    }, [fedFile, setSelectedFile]);

    useEffect(async () => {
        if (selectedFile) {
            await processFile();
        }
    }, [selectedFile, processFile]);

    return (
        <>
            <div className="react-cy-control fed-control">
                <button>
                    <label htmlFor="fedFile">
                        {busy && <FiRefreshCw />}
                        {!busy && <FiUpload />}
                        Upload Fed
                    </label>
                </button>
                <input
                    ref={fedFile}
                    id="fedFile"
                    type="file"
                    style={{ visibility: 'hidden' }}
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    onClick={clearSelection}
                    disabled={busy}
                />
            </div>
        </>
    );
};

export default FedControl;
