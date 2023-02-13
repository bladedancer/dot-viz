import React, { useState, useCallback } from 'react';
import { useCy } from '../../hooks/useCy.js';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import './fedcontrol.css';

const FedControl = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const cy = useCy();

    const onFileUpload = useCallback(async () => {
        setBusy(true);
        // Create an object of formData
        const formData = new FormData();

        // Update the formData object
        formData.append(
            'fed',
            selectedFile,
            selectedFile.name
        );

        await fetch('/api/fed', {
            method: 'POST',
            body: formData,
        });
        setBusy(false);
    }, [selectedFile, setBusy]);

    return (
        <>
            <div className="react-cy-control fed-control">
                <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} disabled={busy} />
                <button onClick={onFileUpload} disabled={busy}>
                    {busy && <FiRefreshCw />}
                    {!busy && <FiUpload />}
                </button>
            </div>
        </>
    );
};

export default FedControl;
