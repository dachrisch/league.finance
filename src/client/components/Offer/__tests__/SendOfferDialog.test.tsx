import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SendOfferDialog } from '../SendOfferDialog';

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

  it('renders when open prop is true', () => {
    render(<SendOfferDialog {...mockProps} />);
    expect(screen.getByText('Send Offer')).toBeInTheDocument();
  });

  it('displays recipient and total information', () => {
    render(<SendOfferDialog {...mockProps} />);
    expect(screen.getByText(/Test Organization/)).toBeInTheDocument();
    expect(screen.getByText(/1904.50/)).toBeInTheDocument();
  });

  it('disables send button when no folder selected', () => {
    render(<SendOfferDialog {...mockProps} />);
    const sendButton = screen.getByRole('button', { name: /Send/ });
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

  it('displays select folder button', () => {
    render(<SendOfferDialog {...mockProps} />);
    expect(screen.getByRole('button', { name: /Select Drive Folder/ })).toBeInTheDocument();
  });

  it('shows send button is disabled initially', () => {
    render(<SendOfferDialog {...mockProps} />);
    const sendButton = screen.getByRole('button', { name: /Send/ });
    expect(sendButton).toBeDisabled();
  });
});
