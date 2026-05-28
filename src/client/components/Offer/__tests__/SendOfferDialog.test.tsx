import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendOfferDialog } from '../SendOfferDialog';
import { trpc } from '../../../lib/trpc';

// Mock trpc
vi.mock('../../../lib/trpc', () => ({
  trpc: {
    finance: {
      settings: {
        get: {
          useQuery: vi.fn(),
        },
      },
    },
    google: {
      listFolders: {
        useQuery: vi.fn(),
      },
    },
  },
}));

describe('SendOfferDialog', () => {
  const mockProps = {
    open: true,
    offerId: 'offer-123',
    recipientEmail: 'test@example.com',
    recipientName: 'Test Organization',
    totalPrice: 1904.5,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock returns
    vi.mocked(trpc.finance.settings.get.useQuery).mockReturnValue({
      data: { defaultDriveFolderId: 'folder-1' },
      isLoading: false,
    } as any);
    
    vi.mocked(trpc.google.listFolders.useQuery).mockReturnValue({
      data: [
        { id: 'folder-1', name: 'Offers 2026' },
        { id: 'folder-2', name: 'Archive' },
      ],
      isLoading: false,
    } as any);
  });

  it('renders when open prop is true', () => {
    render(<SendOfferDialog {...mockProps} />);
    expect(screen.getByRole('heading', { name: /Send Offer/i })).toBeInTheDocument();
  });

  it('displays recipient and total information', () => {
    render(<SendOfferDialog {...mockProps} />);
    expect(screen.getByText(/Test Organization/)).toBeInTheDocument();
    expect(screen.getByText(/1904.50/)).toBeInTheDocument();
  });

  it('disables send button when no folder selected', () => {
    // Override mock to have no folder selected
    vi.mocked(trpc.finance.settings.get.useQuery).mockReturnValue({
      data: { defaultDriveFolderId: '' },
      isLoading: false,
    } as any);

    render(<SendOfferDialog {...mockProps} />);
    const sendButton = screen.getByRole('button', { name: /Send Offer/i });
    expect(sendButton).toBeDisabled();
  });

  it('does not render when open prop is false', () => {
    render(<SendOfferDialog {...mockProps} open={false} />);
    expect(screen.queryByText('Send Offer')).not.toBeInTheDocument();
  });

  it('shows close button that calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SendOfferDialog {...mockProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /Close/ });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('displays select folder information', () => {
    render(<SendOfferDialog {...mockProps} />);
    expect(screen.getByText('Target Drive Folder')).toBeInTheDocument();
    expect(screen.getByText('Offers 2026')).toBeInTheDocument();
  });

  it('shows send button is enabled when default folder is present', () => {
    render(<SendOfferDialog {...mockProps} />);
    const sendButton = screen.getByRole('button', { name: /Send Offer/ });
    expect(sendButton).not.toBeDisabled();
  });
});
