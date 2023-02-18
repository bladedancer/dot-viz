import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import { useSetNodeData } from '../../hooks/useSettings';
import nodify from '../../utils/entitystores';
import loadFed from '../../utils/xml';
import './fedcontrol.css';

const FedControl = ({}) => {
    const fedFile = useRef();
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const { setNodeData } = useSetNodeData();

    const processFile = useCallback(async () => {
        setBusy(true);
        const stores = await loadFed(selectedFile);
        const nodes = await nodify(stores);
        setNodeData(nodes);
        setBusy(false);
    }, [selectedFile]);

    const clearSelection = useCallback(async () => {
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
                        Open Fed
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
