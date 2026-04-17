import { useState, useEffect, useCallback } from 'react';

interface JobStatus {
  jobId?: string;
  status: 'pending' | 'generating-pdf' | 'uploading' | 'sending-email' | 'completed' | 'failed' | 'none';
  progress: number;
  error?: string;
  driveLink?: string;
  completedAt?: Date;
}

export function useSendOfferJob(offerId: string | null) {
  const [status, setStatus] = useState<JobStatus>({
    status: 'none',
    progress: 0,
  });

  const [isPolling, setIsPolling] = useState(false);

  const pollStatus = useCallback(async () => {
    if (!offerId) return;

    try {
      const response = await fetch('/trpc/offersSend.getOfferSendStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!response.ok) {
        console.error('Failed to poll job status');
        setIsPolling(false);
        return;
      }

      const data = await response.json();
      const { result } = data;

      if (result) {
        setStatus(result);

        // Stop polling if completed or failed
        if (result.status === 'completed' || result.status === 'failed' || result.status === 'none') {
          setIsPolling(false);
        }
      }
    } catch (err) {
      console.error('Failed to poll job status:', err);
      setIsPolling(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [isPolling, pollStatus]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
    pollStatus();
  }, [pollStatus]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const retry = useCallback(async () => {
    if (!offerId) return;

    try {
      const response = await fetch('/trpc/offersSend.retryOfferSend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!response.ok) {
        console.error('Retry failed');
        return;
      }

      setStatus({ status: 'pending', progress: 0 });
      startPolling();
    } catch (err) {
      console.error('Retry failed:', err);
    }
  }, [offerId, startPolling]);

  return {
    status,
    isPolling,
    startPolling,
    stopPolling,
    retry,
  };
}
