import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import { useSetNodeData } from '../../hooks/useSettings';
import nodify from '../../utils/nodes';
import './dotcontrol.css';

const DotControl = ({}) => {
    const dotFile = useRef();
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const { setNodeData } = useSetNodeData();

    const processFile = useCallback(async () => {
        setBusy(true);
        const nodes = await nodify(selectedFile);
        setNodeData(nodes);
        setBusy(false);
    }, [selectedFile]);

    const clearSelection = useCallback(async () => {
        setSelectedFile(null);
        dotFile.current.value = '';
    }, [dotFile, setSelectedFile]);

    useEffect(async () => {
        if (selectedFile) {
            await processFile();
        }
    }, [selectedFile, processFile]);

    return (
        <>
            <div className="react-cy-control dot-control">
                <button>
                    <label htmlFor="dotFile">
                        {busy && <FiRefreshCw />}
                        {!busy && <FiUpload />}
                        Open Dot
                    </label>
                </button>
                <input
                    ref={dotFile}
                    id="dotFile"
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

export default DotControl;
