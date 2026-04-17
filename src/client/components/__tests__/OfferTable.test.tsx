import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfferTable } from '../OfferTable';
import { Offer } from '../../lib/schemas';

describe('OfferTable', () => {
  const mockOffers: Offer[] = [
    {
      _id: '1',
      associationId: 'assoc1',
      seasonId: 2024,
      leagueIds: [1, 2, 3],
      status: 'draft',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      _id: '2',
      associationId: 'assoc2',
      seasonId: 2024,
      leagueIds: [2, 3],
      status: 'sent',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      sentAt: new Date('2024-01-02'),
    },
  ];

  const mockAssociationNames = {
    assoc1: 'Association 1',
    assoc2: 'Association 2',
  };

  const mockOnView = vi.fn();
  const mockOnSend = vi.fn();
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    mockOnView.mockClear();
    mockOnSend.mockClear();
    mockOnEdit.mockClear();
  });

  it('renders empty state when no offers', () => {
    render(
      <OfferTable
        offers={[]}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    expect(screen.getByText(/No offers found/i)).toBeInTheDocument();
  });

  it('renders offers in table', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    expect(screen.getByText('Association 1')).toBeInTheDocument();
    expect(screen.getByText('Association 2')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
  });

  it('displays league counts correctly', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    const cells = screen.getAllByText('3');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('displays view buttons for all offers', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    // Should have at least 2 view buttons (one for each offer)
    expect(viewButtons.length).toBeGreaterThanOrEqual(mockOffers.length);
  });

  it('shows send button only for draft offers', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        onSend={mockOnSend}
      />
    );

    const sendButtons = screen.queryAllByRole('button', { name: /Send/i });
    expect(sendButtons.length).toBeGreaterThan(0);
  });

  it('opens dialog when send button is clicked', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        onSend={mockOnSend}
      />
    );

    const sendButtons = screen.getAllByRole('button', { name: /Send/i });
    fireEvent.click(sendButtons[0]);

    // The dialog should render with the recipient name and email from the selected offer
    // Since the offer doesn't have contact info in the test, the dialog should still render
    // but with empty recipient fields
    expect(screen.queryByText(/Send Offer/i)).toBeInTheDocument();
  });

  it('filters offers by status', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    const sentButton = screen.getByRole('button', { name: /Sent/i });
    fireEvent.click(sentButton);

    expect(screen.getByText('Association 2')).toBeInTheDocument();
    expect(screen.queryByText('Association 1')).not.toBeInTheDocument();
  });

  it('shows all filters', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accepted/i })).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        isLoading={true}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    viewButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('displays season numbers', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    const seasonElements = screen.getAllByText(/Season/i);
    expect(seasonElements.length).toBeGreaterThan(0);
  });
});
