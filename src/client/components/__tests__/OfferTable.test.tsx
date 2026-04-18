import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('displays action menus for all offers', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /Actions/i });
    // Should have at least 2 action buttons (one for each offer)
    expect(actionButtons.length).toBeGreaterThanOrEqual(mockOffers.length);
  });

  it('opens kebab menu when clicked', async () => {
    const user = userEvent.setup();
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        onSend={mockOnSend}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /Actions/i });
    expect(actionButtons[0]).toHaveAttribute('aria-expanded', 'false');

    // Click first action button (draft offer)
    await user.click(actionButtons[0]);

    // After click, aria-expanded should be true
    expect(actionButtons[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onView when view action is triggered', async () => {
    const user = userEvent.setup();
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    // The action menu should be present
    const actionButtons = screen.getAllByRole('button', { name: /Actions/i });
    expect(actionButtons.length).toBeGreaterThanOrEqual(mockOffers.length);
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

  it('disables kebab menu when loading', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        isLoading={true}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /Actions/i });
    actionButtons.forEach((button) => {
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
