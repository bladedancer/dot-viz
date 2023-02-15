import React, { useState, useCallback, useEffect } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import './fedcontrol.css';

const FedControl = ({}) => {
    const [busy, setBusy] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const onFileUpload = useCallback(async () => {
        console.log('onFileUpload');
        setBusy(true);
        const formData = new FormData();
        formData.append('fed', selectedFile, selectedFile.name);

        await fetch('/api/feds', {
            method: 'POST',
            body: formData,
        });

        // TODO: Catch the response and set the state
        setBusy(false);
    }, [selectedFile, setBusy]);

    useEffect(async () => {
        console.log(selectedFile)
        if (selectedFile) {
            await onFileUpload();
        }
    }, [selectedFile, onFileUpload]);

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
                    id="fedFile"
                    type="file"
                    style={{ visibility: 'hidden' }}
                    onChange={(e) =>
                        setSelectedFile(e.target.files[0])
                    }
                    disabled={busy}
                />
            </div>
        </>
    );
};

export default FedControl;
