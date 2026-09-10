import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackedLeagueList } from '../TrackedLeagueList';

const contacts = [{ _id: 'contact-1', name: 'Michael Hanke' }];

const league = (over: Record<string, any> = {}) => ({
  _id: 'tl-1',
  contactId: 'contact-1',
  name: 'Regionalliga Hessen',
  year: 2026,
  isYouth: false,
  estimatedTeamsCount: null,
  estimatedGamedaysCount: null,
  comment: '',
  leaguesphereLeagueId: null,
  linkedOfferId: null,
  status: 'lead',
  effectiveStatus: { stage: 'lead' },
  ...over,
});

describe('TrackedLeagueList', () => {
  it('shows the empty state', () => {
    render(
      <TrackedLeagueList
        trackedLeagues={[]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByText(/No tracked leagues yet/i)).toBeInTheDocument();
  });

  it('groups leagues by year and shows the effective status label', () => {
    render(
      <TrackedLeagueList
        trackedLeagues={[league({ year: 2026 }), league({ _id: 'tl-2', year: 2025, effectiveStatus: { stage: 'paid', offerId: 'o1' } })]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('shows a crosscheck suggestion and links it on click', () => {
    const onLink = vi.fn();
    render(
      <TrackedLeagueList
        trackedLeagues={[league()]}
        contacts={contacts}
        crosscheckSuggestions={{ 'tl-1': [{ leaguesphereLeagueId: 16, name: 'Regionalliga Hessen', confidence: 'exact' }] }}
        onLink={onLink}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Link'));
    expect(onLink).toHaveBeenCalledWith('tl-1', 16);
  });

  it('disables selection for a league with no leaguesphereLeagueId, and enables it once linked', () => {
    const { rerender } = render(
      <TrackedLeagueList
        trackedLeagues={[league()]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).toBeDisabled();

    rerender(
      <TrackedLeagueList
        trackedLeagues={[league({ leaguesphereLeagueId: 16 })]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).not.toBeDisabled();
  });

  it('calls onCreateOfferFromSelected with the selection once a linked league is checked', () => {
    const onCreateOfferFromSelected = vi.fn();
    render(
      <TrackedLeagueList
        trackedLeagues={[league({ leaguesphereLeagueId: 16 })]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={onCreateOfferFromSelected}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText(/Create Offer from Selected/i));

    expect(onCreateOfferFromSelected).toHaveBeenCalledWith({
      ids: ['tl-1'],
      contactId: 'contact-1',
      year: 2026,
      leaguesphereLeagueIds: [16],
    });
  });

  it('shows a validation error instead of allowing submission when years differ', () => {
    render(
      <TrackedLeagueList
        trackedLeagues={[
          league({ leaguesphereLeagueId: 16, year: 2026 }),
          league({ _id: 'tl-2', leaguesphereLeagueId: 17, year: 2025 }),
        ]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);

    expect(screen.getByText(/must all be from the same year/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Offer from Selected/i)).toBeDisabled();
  });
});
