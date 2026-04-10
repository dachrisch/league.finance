import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfferCard } from '../OfferCard';
import { Offer } from '../../lib/schemas';

describe('OfferCard', () => {
  const mockOffer: Offer = {
    _id: '123',
    status: 'draft',
    associationId: 'assoc1',
    seasonId: 2024,
    selectedLeagueIds: [1, 2],
    sentTo: [],
    notes: '',
    driveFileId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sentAt: null,
    viewedAt: null,
    completedAt: null,
  };

  const mockAssociationName = 'Tigers FC';
  const mockLeagueNames: Record<number, string> = {
    1: 'League A',
    2: 'League B',
  };
  const mockContactName = 'John Smith';

  it('should render offer details with status badge', () => {
    const onView = vi.fn();
    const onDelete = vi.fn();

    render(
      <OfferCard
        offer={mockOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Tigers FC')).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('League A')).toBeInTheDocument();
    expect(screen.getByText('League B')).toBeInTheDocument();
  });

  it('should call onView when View button clicked', () => {
    const onView = vi.fn();
    const onDelete = vi.fn();

    render(
      <OfferCard
        offer={mockOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const viewButton = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    expect(onView).toHaveBeenCalledWith('123');
  });

  it('should show accepted status with green border', () => {
    const acceptedOffer: Offer = { ...mockOffer, status: 'accepted' };
    const onView = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <OfferCard
        offer={acceptedOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const card = container.firstChild as HTMLElement;
    const style = window.getComputedStyle(card);
    expect(style.borderLeftColor).toBe('rgb(40, 167, 69)');
  });

  it('should show delete button only for draft offers', () => {
    const onView = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <OfferCard
        offer={mockOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();

    const sentOffer: Offer = { ...mockOffer, status: 'sent' };
    rerender(
      <OfferCard
        offer={sentOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });

  it('should call onDelete when Delete button clicked', () => {
    const onView = vi.fn();
    const onDelete = vi.fn();

    render(
      <OfferCard
        offer={mockOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('123');
  });

  it('should render draft status with yellow border', () => {
    const onView = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <OfferCard
        offer={mockOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const card = container.firstChild as HTMLElement;
    const style = window.getComputedStyle(card);
    expect(style.borderLeftColor).toBe('rgb(255, 193, 7)');
  });

  it('should render sent status with cyan border', () => {
    const sentOffer: Offer = { ...mockOffer, status: 'sent' };
    const onView = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <OfferCard
        offer={sentOffer}
        associationName={mockAssociationName}
        leagueNames={mockLeagueNames}
        contactName={mockContactName}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const card = container.firstChild as HTMLElement;
    const style = window.getComputedStyle(card);
    expect(style.borderLeftColor).toBe('rgb(23, 162, 184)');
  });
});
