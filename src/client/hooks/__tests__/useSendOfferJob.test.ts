import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSendOfferJob } from '../useSendOfferJob';

// Mock fetch
global.fetch = vi.fn();

const mockJobStatus = {
  jobId: 'job-123',
  status: 'pending' as const,
  progress: 0,
};

const mockTrpcResponse = (data: any) => ({
  result: data,
});

describe('useSendOfferJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with "none" status', () => {
    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    expect(result.current.status.status).toBe('none');
    expect(result.current.status.progress).toBe(0);
    expect(result.current.isPolling).toBe(false);
  });

  it('should initialize with null offerId', () => {
    const { result } = renderHook(() => useSendOfferJob(null));

    expect(result.current.status.status).toBe('none');
    expect(result.current.isPolling).toBe(false);
  });

  it('should start polling when startPolling is called', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrpcResponse(mockJobStatus),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    expect(result.current.isPolling).toBe(false);

    act(() => {
      result.current.startPolling();
    });

    expect(result.current.isPolling).toBe(true);
  });

  it('should fetch status when polling', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () =>
        mockTrpcResponse({
          ...mockJobStatus,
          status: 'generating-pdf',
          progress: 25,
        }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    // Wait for the polling to fetch status
    await waitFor(
      () => {
        expect(result.current.status.status).toBe('generating-pdf');
      },
      { timeout: 3000 }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/trpc/offersSend.getOfferSendStatus',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: 'offer-123' }),
      })
    );
  });

  it('should stop polling when stopPolling is called', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrpcResponse(mockJobStatus),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    expect(result.current.isPolling).toBe(true);

    act(() => {
      result.current.stopPolling();
    });

    expect(result.current.isPolling).toBe(false);
  });

  it('should auto-stop polling when status is "completed"', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () =>
        mockTrpcResponse({
          ...mockJobStatus,
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    await waitFor(
      () => {
        expect(result.current.status.status).toBe('completed');
        expect(result.current.isPolling).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it('should auto-stop polling when status is "failed"', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () =>
        mockTrpcResponse({
          ...mockJobStatus,
          status: 'failed',
          progress: 50,
          error: 'PDF generation failed',
        }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    await waitFor(
      () => {
        expect(result.current.status.status).toBe('failed');
        expect(result.current.status.error).toBe('PDF generation failed');
        expect(result.current.isPolling).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it('should auto-stop polling when status is "none"', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () =>
        mockTrpcResponse({
          status: 'none',
          progress: 0,
        }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    await waitFor(
      () => {
        expect(result.current.status.status).toBe('none');
        expect(result.current.isPolling).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it('should handle polling errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    await waitFor(
      () => {
        expect(result.current.isPolling).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to poll job status:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle HTTP errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Not found' }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    await waitFor(
      () => {
        expect(result.current.isPolling).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to poll job status:',
      expect.any(Object)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should retry offer send and reset status', async () => {
    // First mock for retry call (returns success)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          jobId: 'job-456',
          status: 'queued',
        },
      }),
    });

    // Then mock for polling calls (returns pending status)
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () =>
        mockTrpcResponse({
          jobId: 'job-456',
          status: 'pending',
          progress: 0,
        }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.status.status).toBe('pending');
      expect(result.current.status.progress).toBe(0);
      expect(result.current.isPolling).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/trpc/offersSend.retryOfferSend',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: 'offer-123' }),
      })
    );
  });

  it('should handle retry errors with proper error logging', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Maximum retry attempts reached' }),
    });

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    await act(async () => {
      result.current.retry();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Retry failed:',
      'Maximum retry attempts reached'
    );

    // Status should not change on error
    expect(result.current.status.status).toBe('none');
    expect(result.current.isPolling).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should handle retry network errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSendOfferJob('offer-123'));

    await act(async () => {
      result.current.retry();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Retry failed:',
      expect.any(Error)
    );

    expect(result.current.isPolling).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should not poll if offerId is null', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrpcResponse(mockJobStatus),
    });

    const { result } = renderHook(() => useSendOfferJob(null));

    act(() => {
      result.current.startPolling();
    });

    // Wait a bit to ensure fetch wouldn't be called
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not retry if offerId is null', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrpcResponse({ status: 'queued' }),
    });

    const { result } = renderHook(() => useSendOfferJob(null));

    await act(async () => {
      result.current.retry();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should clean up intervals on unmount', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrpcResponse(mockJobStatus),
    });

    const { result, unmount } = renderHook(() => useSendOfferJob('offer-123'));

    act(() => {
      result.current.startPolling();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});
