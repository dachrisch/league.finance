// src/client/components/Offer/__tests__/FileOfferDialog.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
