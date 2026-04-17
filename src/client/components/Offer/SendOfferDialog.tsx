import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SendOfferDialogProps {
  open: boolean;
  offerId: string;
  recipientEmail: string;
  recipientName: string;
  totalPrice: number;
  onClose: () => void;
  onSuccess: (driveLink: string) => void;
  onError: (message: string) => void;
}

type JobStatus = 'pending' | 'generating-pdf' | 'uploading' | 'sending-email' | 'completed' | 'failed';

interface JobProgress {
  stage: JobStatus;
  percentage: number;
}

export function SendOfferDialog({
  open,
  offerId,
  recipientEmail,
  recipientName,
  totalPrice,
  onClose,
  onSuccess,
  onError,
}: SendOfferDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleSelectFolder = useCallback(async () => {
    // This would integrate with Google Drive Picker API
    // For now, show a placeholder
    console.log('Opening Drive folder picker...');
    // In production, initialize Google Drive Picker here
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedFolderId) {
      onError('Please select a Drive folder first');
      return;
    }

    setIsLoading(true);
    setProgress({ stage: 'pending', percentage: 0 });

    try {
      // Call tRPC sendOffer mutation
      const response = await fetch('/trpc/offersSend.sendOffer', {
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
      const { result } = data;

      if (!result?.jobId) {
        throw new Error('No job ID returned');
      }

      // Poll for job status
      const maxAttempts = 60;
      let attempts = 0;

      pollIntervalRef.current = setInterval(async () => {
        attempts++;

        try {
          const statusResponse = await fetch('/trpc/offersSend.getOfferSendStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offerId }),
          });

          if (!statusResponse.ok) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoading(false);
            onError('Failed to check job status');
            return;
          }

          const statusData = await statusResponse.json();
          const { result: statusResult } = statusData;

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
      onError(err.message || 'Failed to send offer');
    }
  }, [offerId, selectedFolderId, onError, onSuccess, onClose]);

  if (!open) return null;

  const stageText: Record<JobStatus, string> = {
    pending: 'Pending...',
    'generating-pdf': 'Generating PDF...',
    'uploading': 'Uploading to Drive...',
    'sending-email': 'Sending email...',
    'completed': 'Complete!',
    'failed': 'Failed',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Send Offer</h2>

        <div className="bg-gray-50 p-4 rounded mb-4 space-y-2">
          <p>
            <span className="font-semibold">To:</span> {recipientName} ({recipientEmail})
          </p>
          <p>
            <span className="font-semibold">Total:</span> €{totalPrice.toFixed(2)}
          </p>
        </div>

        {!progress ? (
          <>
            <button
              onClick={handleSelectFolder}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded mb-4 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {selectedFolderId ? '✓ Folder Selected' : 'Select Drive Folder'}
            </button>

            <button
              onClick={handleSend}
              disabled={!selectedFolderId || isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-600 h-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-center text-sm font-medium text-gray-700">
              {stageText[progress.stage]}
            </p>
            <p className="text-center text-xs text-gray-500">
              {progress.percentage}%
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          disabled={isLoading}
          className="w-full mt-4 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition py-2"
        >
          {isLoading ? 'Sending...' : 'Close'}
        </button>
      </div>
    </div>
  );
}
