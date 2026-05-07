import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnView.mockClear();
    mockOnDelete.mockClear();
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

  it('calls onView when a row is clicked', async () => {
    const user = userEvent.setup();
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
      />
    );

    // Click Association 1 row
    const row = screen.getByText('Association 1').closest('tr');
    expect(row).not.toBeNull();
    if (row) await user.click(row);

    expect(mockOnView).toHaveBeenCalledWith('1');
  });

  it('displays delete button for draft offers only', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete Offer');
    expect(deleteButtons.length).toBe(1); // Only for Association 1 (draft)
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTitle('Delete Offer');
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
    expect(mockOnView).not.toHaveBeenCalled(); // Ensure event propagation was stopped
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

  it('disables interactions when loading', () => {
    render(
      <OfferTable
        offers={mockOffers}
        associationNames={mockAssociationNames}
        onView={mockOnView}
        onDelete={mockOnDelete}
        isLoading={true}
      />
    );

    // Filter buttons should be disabled
    const filterButtons = screen.getAllByRole('button');
    filterButtons.forEach((button) => {
      // Except for the delete button which might not be in the DOM if we use opacity/pointerEvents
      if (button.className.includes('chip')) {
        expect(button).toBeDisabled();
      }
    });

    // The table container should have pointer-events: none
    const tableContainer = screen.getByRole('table').parentElement;
    expect(tableContainer).toHaveStyle({ pointerEvents: 'none' });
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
