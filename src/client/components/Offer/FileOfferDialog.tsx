import React, { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '../../lib/trpc';

interface FileOfferDialogProps {
  open: boolean;
  offerId: string;
  recipientName: string;
  totalPrice: number;
  onClose: () => void;
  onSuccess: (driveLink: string) => void;
  onError: (message: string) => void;
}

type JobStatus = 'pending' | 'generating-pdf' | 'uploading' | 'completed' | 'failed';

interface JobProgress {
  stage: JobStatus;
  percentage: number;
}

export function FileOfferDialog({
  open,
  offerId,
  recipientName,
  totalPrice,
  onClose,
  onSuccess,
  onError,
}: FileOfferDialogProps) {
  const { data: settings } = trpc.finance.settings.get.useQuery(undefined, { enabled: open });
  const { data: folders = [] } = trpc.google.listFolders.useQuery(undefined, { enabled: open });

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize selectedFolderId with default from settings
  useEffect(() => {
    if (settings?.defaultDriveFolderId && !selectedFolderId) {
      setSelectedFolderId(settings.defaultDriveFolderId);
    }
  }, [settings, selectedFolderId]);

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedFolderId) {
      onError('Please select a Drive folder first');
      return;
    }

    setIsLoading(true);
    setProgress({ stage: 'pending', percentage: 0 });

    try {
      // Call tRPC fileOfferInDrive mutation
      const response = await fetch('/trpc/finance.offersDrive.fileOfferInDrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          driveFolderId: selectedFolderId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to queue job');
      }

      const data = await response.json();
      // tRPC wraps procedure output as { result: { data: <output> } }
      const result = data?.result?.data;

      if (!result?.jobId) {
        throw new Error('No job ID returned');
      }

      // Poll for job status
      const maxAttempts = 60;
      let attempts = 0;

      pollIntervalRef.current = setInterval(async () => {
        attempts++;

        try {
          // getOfferDriveStatus is a tRPC query; over HTTP it must be a GET
          // with the input in the ?input= query param (a POST returns 405).
          const statusInput = encodeURIComponent(JSON.stringify({ offerId }));
          const statusResponse = await fetch(
            `/trpc/finance.offersDrive.getOfferDriveStatus?input=${statusInput}`
          );

          if (!statusResponse.ok) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoading(false);
            onError('Failed to check job status');
            return;
          }

          const statusData = await statusResponse.json();
          const statusResult = statusData?.result?.data;

          if (!statusResult) {
            throw new Error('No status returned');
          }

          const { status, progress: percent, driveLink, error } = statusResult;

          setProgress({
            stage: status as JobStatus,
            percentage: percent,
          });

          if (status === 'completed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoading(false);
            onSuccess(driveLink);
            setTimeout(onClose, 1000);
          } else if (status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoading(false);
            onError(error || 'Job failed to complete');
          } else if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoading(false);
            onError('Job timeout - took too long to complete');
          }
        } catch (pollError: any) {
          console.error('Poll error:', pollError);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsLoading(false);
          onError('Error checking job status: ' + pollError.message);
        }
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      onError(err.message || 'Failed to file offer');
    }
  }, [offerId, selectedFolderId, onError, onSuccess, onClose]);

  if (!open) return null;

  const stageText: Record<JobStatus, string> = {
    pending: 'Pending...',
    'generating-pdf': 'Generating PDF...',
    'uploading': 'Uploading to Drive...',
    'completed': 'Filed in Drive!',
    'failed': 'Failed',
  };

  const selectedFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'None selected';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem',
      backdropFilter: 'blur(2px)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>Create offer in Drive</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--spacing-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <p style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: 'var(--font-size-md)' }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>For:</span> {recipientName}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Total:</span> €{totalPrice.toFixed(2)}
          </p>
        </div>

        {!progress ? (
          <>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="form-label">Target Drive Folder</label>
              {showFolderPicker ? (
                <select
                  value={selectedFolderId}
                  onChange={(e) => {
                    setSelectedFolderId(e.target.value);
                    setShowFolderPicker(false);
                  }}
                  className="form-control"
                >
                  <option value="">Select a folder...</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              ) : (
                <div
                  onClick={() => !isLoading && setShowFolderPicker(true)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    background: isLoading ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 'var(--spacing-sm)' }}>
                    {selectedFolderName}
                  </span>
                  <span style={{ color: 'var(--primary-color)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>
                    Change
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!selectedFolderId || isLoading}
              className="btn btn-primary"
              style={{ width: '100%', background: 'var(--success-color)' }}
            >
              Create in Drive
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              borderRadius: '999px',
              height: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
            }}>
              <div
                style={{
                  width: `${progress.percentage}%`,
                  height: '100%',
                  background: progress.stage === 'failed' ? 'var(--danger-color)' : 'var(--success-color)',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-main)', margin: 0 }}>
              {stageText[progress.stage]}
            </p>
            <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: 0 }}>
              {progress.percentage}%
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
        >
          {isLoading ? 'Processing...' : 'Close'}
        </button>
      </div>
    </div>
  );
}
