// src/client/hooks/useOfferPdfPreview.ts

import { trpc } from '../lib/trpc';

/**
 * Opens the offer letter PDF preview in a new tab.
 *
 * Always fetches fresh: `previewPdf` is a tRPC query, and the app's QueryClient default
 * `staleTime` is 30s (src/client/main.tsx) — without `{ staleTime: 0 }`, re-opening the
 * preview shortly after saving lines/letter fields could silently serve the pre-edit PDF
 * from cache instead of re-fetching.
 *
 * Wrapped in try/catch: `previewPdf` can fail (e.g. the offer was deleted meanwhile), and
 * without it the failure was silent — no PDF opens and nothing tells the admin why.
 */
export function useOfferPdfPreview() {
  const utils = trpc.useUtils();
  return async (id: string) => {
    try {
      const { base64 } = await utils.finance.offers.previewPdf.fetch({ id }, { staleTime: 0 });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
    } catch (err: any) {
      alert(`PDF-Vorschau fehlgeschlagen: ${err?.message ?? err}`);
    }
  };
}
