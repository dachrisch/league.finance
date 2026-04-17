import { useState, useEffect, useCallback, useRef } from 'react';

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
  const intervalRef = useRef<number | null>(null);

  // Polling function - moved inside useEffect to avoid dependency issues
  const poll = useCallback(async () => {
    if (!offerId) return;

    try {
      const response = await fetch('/trpc/offersSend.getOfferSendStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to poll job status:', errorData);
        setIsPolling(false);
        return;
      }

      const data = await response.json();
      const { result } = data;

      if (result) {
        setStatus(result);

        // Stop polling if completed, failed, or no job exists
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
    if (!isPolling) {
      // Clean up interval when polling stops
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling immediately on first call
    poll();

    // Then set up interval for subsequent polls
    intervalRef.current = window.setInterval(() => {
      poll();
    }, 1000);

    // Cleanup on unmount or when isPolling changes
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, poll]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

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
        const errorData = await response.json();
        console.error('Retry failed:', errorData.message || 'Unknown error');
        return;
      }

      setStatus({ status: 'pending', progress: 0 });
      setIsPolling(true);
    } catch (err) {
      console.error('Retry failed:', err);
    }
  }, [offerId]);

  return {
    status,
    isPolling,
    startPolling,
    stopPolling,
    retry,
  };
}
