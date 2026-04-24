import React, { useState, useCallback } from 'react';
import { useCy } from '../../hooks/useCy.js';
import { saveAs } from 'file-saver';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import './exportcontrol.css';

const ExportControl = () => {
    const [busy, setBusy] = useState(false);
    const cy = useCy();

    const exportCy = useCallback(async () => {
        setBusy(true);
        try {
            const img = await cy.png({ full: true, scale: 1, output: 'blob-promise' });
            saveAs(img, 'graph.png');
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setBusy(false);
        }
    }, [cy]);

    return (
        <>
            <div className="react-cy-control export-control">
                <button onClick={exportCy} disabled={busy}>
                    {busy && <FiRefreshCw />}
                    {!busy && <FiDownload />}
                    Export PNG
                </button>
            </div>
        </>
    );
};

export default ExportControl;
