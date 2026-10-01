// src/client/hooks/__tests__/useOfferPdfPreview.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOfferPdfPreview } from '../useOfferPdfPreview';

const fetchMock = vi.fn();
vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ finance: { offers: { previewPdf: { fetch: fetchMock } } } }),
  },
}));

describe('useOfferPdfPreview', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  });

  // F1: previewPdf is a tRPC query and the app's QueryClient defaults staleTime to 30s
  // (src/client/main.tsx) — without an explicit override, re-opening the preview shortly
  // after a lines/letter save could silently serve the stale, pre-edit PDF from cache.
  it('F1: fetches with staleTime 0 so the preview is never served from the 30s cache', async () => {
    fetchMock.mockResolvedValue({ base64: btoa('%PDF-1.4 mock') });
    const { result } = renderHook(() => useOfferPdfPreview());

    await result.current('offer-1');

    expect(fetchMock).toHaveBeenCalledWith({ id: 'offer-1' }, { staleTime: 0 });
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');
    expect(window.alert).not.toHaveBeenCalled();
  });

  // F11: openPreview had no try/catch, so a failed fetch (e.g. offer deleted) failed silently.
  it('F11: alerts with the error message instead of throwing when the fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('Offer not found'));
    const { result } = renderHook(() => useOfferPdfPreview());

    await expect(result.current('offer-1')).resolves.toBeUndefined();

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Offer not found'));
    expect(window.open).not.toHaveBeenCalled();
  });
});
