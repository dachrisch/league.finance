// src/client/components/Offer/__tests__/FileOfferDialog.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileOfferDialog } from '../FileOfferDialog';

vi.mock('../../../lib/trpc', () => ({
  trpc: {
    finance: { settings: { get: { useQuery: () => ({ data: { defaultDriveFolderId: 'fold1' } }) } } },
    google: { listFolders: { useQuery: () => ({ data: [{ id: 'fold1', name: 'Invoices 2026' }] }) } },
  },
}));

beforeEach(() => vi.restoreAllMocks());

describe('FileOfferDialog', () => {
  const baseProps = {
    open: true, offerId: 'o1', recipientName: 'Lynn Hoffer', totalPrice: 840,
    onClose: vi.fn(), onSuccess: vi.fn(), onError: vi.fn(),
  };

  it('renders the file-in-Drive title and no email text', () => {
    render(<FileOfferDialog {...baseProps} />);
    expect(screen.getByRole('heading', { name: /Create offer in Drive/i })).toBeTruthy();
    expect(screen.queryByText(/email/i)).toBeNull();
  });

  it('prefills the default folder and shows the file action', () => {
    render(<FileOfferDialog {...baseProps} />);
    expect(screen.getByText('Invoices 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create in Drive/i })).toBeTruthy();
  });

  it('reads the jobId from the tRPC { result: { data } } envelope and completes on success', async () => {
    // tRPC (non-batched) wraps procedure output as { result: { data: <output> } }.
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('fileOfferInDrive')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: { data: { jobId: 'job-1', status: 'queued' } } }),
        });
      }
      if (url.includes('getOfferDriveStatus')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            result: { data: { status: 'completed', progress: 100, driveLink: 'https://drive.google.com/file/d/abc/view' } },
          }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const props = { ...baseProps, onSuccess: vi.fn(), onError: vi.fn() };
    render(<FileOfferDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Create in Drive/i }));

    await waitFor(
      () => expect(props.onSuccess).toHaveBeenCalledWith('https://drive.google.com/file/d/abc/view'),
      { timeout: 4000 }
    );
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('polls the drive-status query with GET (tRPC queries reject POST with 405)', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      if (url.includes('fileOfferInDrive')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: { data: { jobId: 'job-1' } } }),
        });
      }
      if (url.includes('getOfferDriveStatus')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            result: { data: { status: 'completed', progress: 100, driveLink: 'https://drive.google.com/file/d/abc/view' } },
          }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const props = { ...baseProps, onSuccess: vi.fn(), onError: vi.fn() };
    render(<FileOfferDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Create in Drive/i }));

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled(), { timeout: 4000 });

    const statusCall = calls.find((c) => c.url.includes('getOfferDriveStatus'));
    expect(statusCall).toBeTruthy();
    // getOfferDriveStatus is a tRPC *query*; over HTTP it only accepts GET.
    expect((statusCall!.method ?? 'GET').toUpperCase()).toBe('GET');
    // The input travels as an ?input= query param, not a POST body.
    expect(statusCall!.url).toContain('input=');
  });
});
