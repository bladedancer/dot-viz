import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import { useSetNodeData, useSetLoading } from '../../hooks/useSettings';
import nodify from '../../utils/nodes';
import './dotcontrol.css';

const DotControl = () => {
    const dotFile = useRef();
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);
    const { setNodeData } = useSetNodeData();
    const { setLoading } = useSetLoading();

    const processFile = useCallback(async () => {
        setBusy(true);
        setLoading(true);
        setError(null);
        try {
            const nodes = await nodify(selectedFile);
            setNodeData(nodes);
        } catch (err) {
            setError(`Failed to parse file: ${err.message || err}`);
        }
        setBusy(false);
        setLoading(false);
    }, [selectedFile]);

    const clearSelection = useCallback(async () => {
        setSelectedFile(null);
        setError(null);
        dotFile.current.value = '';
    }, [dotFile, setSelectedFile]);

    useEffect(() => {
        if (selectedFile) {
            processFile();
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
                {error && <div className="dot-control-error">{error}</div>}
            </div>
        </>
    );
};

export default DotControl;
