import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileInvoiceDialog } from '../FileInvoiceDialog';

vi.mock('../../../lib/trpc', () => ({
  trpc: {
    finance: { settings: { get: { useQuery: () => ({ data: { defaultDriveFolderId: 'fold1' } }) } } },
    google: { listFolders: { useQuery: () => ({ data: [{ id: 'fold1', name: 'Invoices 2026' }] }) } },
  },
}));

beforeEach(() => vi.restoreAllMocks());

describe('FileInvoiceDialog', () => {
  const baseProps = {
    open: true, invoiceId: 'i1', recipientName: 'AFCV NRW', totalPrice: 2265.76,
    onClose: vi.fn(), onSuccess: vi.fn(), onError: vi.fn(),
  };

  it('renders the file-in-Drive title', () => {
    render(<FileInvoiceDialog {...baseProps} />);
    expect(screen.getByRole('heading', { name: /File invoice in Drive/i })).toBeTruthy();
  });

  it('prefills the default folder and shows the file action', () => {
    render(<FileInvoiceDialog {...baseProps} />);
    expect(screen.getByText('Invoices 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: /File in Drive/i })).toBeTruthy();
  });

  it('reads the jobId from the tRPC { result: { data } } envelope and completes on success', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('fileInvoiceInDrive')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: { data: { jobId: 'job-1', status: 'queued' } } }),
        });
      }
      if (url.includes('getInvoiceDriveStatus')) {
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
    render(<FileInvoiceDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /File in Drive/i }));

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
      if (url.includes('fileInvoiceInDrive')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: { data: { jobId: 'job-1' } } }) });
      }
      if (url.includes('getInvoiceDriveStatus')) {
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
    render(<FileInvoiceDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /File in Drive/i }));

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled(), { timeout: 4000 });

    const statusCall = calls.find((c) => c.url.includes('getInvoiceDriveStatus'));
    expect(statusCall).toBeTruthy();
    expect((statusCall!.method ?? 'GET').toUpperCase()).toBe('GET');
    expect(statusCall!.url).toContain('input=');
  });
});
