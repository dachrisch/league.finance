import { useMemo, useState } from 'react';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  contacted: 'Contacted',
  offer_in_progress: 'Offer in progress',
  rejected_pre_offer: 'Rejected (pre-offer)',
  closed_historical: 'Closed (historical)',
  offer_draft: 'Offer draft',
  offer_awaiting_decision: 'Awaiting decision',
  offer_rejected: 'Rejected',
  accepted_awaiting_invoice: 'Accepted, awaiting invoice',
  invoiced_unpaid: 'Invoiced, unpaid',
  paid: 'Paid',
};

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  lead: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
  contacted: { bg: '#eff6ff', color: '#0369a1' },
  offer_in_progress: { bg: '#fff7ed', color: '#c2410c' },
  rejected_pre_offer: { bg: '#fef2f2', color: '#b91c1c' },
  closed_historical: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
  offer_draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
  offer_awaiting_decision: { bg: '#eff6ff', color: '#0369a1' },
  offer_rejected: { bg: '#fef2f2', color: '#b91c1c' },
  accepted_awaiting_invoice: { bg: '#fff7ed', color: '#c2410c' },
  invoiced_unpaid: { bg: '#fff7ed', color: '#c2410c' },
  paid: { bg: '#ecfdf5', color: 'var(--success-color)' },
};

export interface TrackedLeagueRow {
  _id: string;
  contactId: string | null;
  name: string;
  year: number;
  isYouth: boolean;
  estimatedTeamsCount: string | null;
  estimatedGamedaysCount: string | null;
  comment: string;
  leaguesphereLeagueId: number | null;
  linkedOfferId: string | null;
  status: string;
  effectiveStatus: { stage: string; offerId?: string };
}

export interface CrosscheckCandidate {
  leaguesphereLeagueId: number;
  name: string;
  confidence: 'exact' | 'partial';
}

export interface TrackedLeagueListProps {
  trackedLeagues: TrackedLeagueRow[];
  contacts: { _id: string; name: string }[];
  crosscheckSuggestions: Record<string, CrosscheckCandidate[]>;
  onLink: (trackedLeagueId: string, leaguesphereLeagueId: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateOfferFromSelected: (selection: { ids: string[]; contactId: string; year: number; leaguesphereLeagueIds: number[] }) => void;
}

export function TrackedLeagueList({
  trackedLeagues, contacts, crosscheckSuggestions, onLink, onEdit, onDelete, onCreateOfferFromSelected,
}: TrackedLeagueListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const contactName = (id: string | null) => contacts.find((c) => c._id === id)?.name || '—';

  const byYear = useMemo(() => {
    const groups = new Map<number, TrackedLeagueRow[]>();
    for (const league of trackedLeagues) {
      const list = groups.get(league.year) || [];
      list.push(league);
      groups.set(league.year, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [trackedLeagues]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedLeagues = trackedLeagues.filter((l) => selected.has(l._id));

  const selectionError = useMemo(() => {
    if (selectedLeagues.length === 0) return null;
    if (selectedLeagues.some((l) => !l.leaguesphereLeagueId)) {
      return 'Every selected league must be linked to a real leaguesphere league first.';
    }
    const years = new Set(selectedLeagues.map((l) => l.year));
    if (years.size > 1) return 'Selected leagues must all be from the same year.';
    const contactIds = new Set(selectedLeagues.map((l) => l.contactId));
    if (contactIds.has(null) || contactIds.size > 1) return 'Selected leagues must all share the same contact.';
    return null;
  }, [selectedLeagues]);

  if (trackedLeagues.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No tracked leagues yet.
      </div>
    );
  }

  return (
    <div>
      {byYear.map(([year, leagues]) => (
        <div key={year} style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', margin: '0 0 var(--spacing-sm) 0' }}>{year}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                <th></th>
                <th>League</th>
                <th>Contact</th>
                <th>Teams / Gamedays</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((league) => {
                const stageStyle = STAGE_COLORS[league.effectiveStatus.stage] || STAGE_COLORS.lead;
                const suggestions = crosscheckSuggestions[league._id] || [];
                return (
                  <tr key={league._id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(league._id)}
                        onChange={() => toggleSelected(league._id)}
                        disabled={!league.leaguesphereLeagueId}
                        title={!league.leaguesphereLeagueId ? 'Link to a leaguesphere league first' : undefined}
                      />
                    </td>
                    <td onClick={() => onEdit(league._id)} style={{ cursor: 'pointer' }}>
                      {league.name} {league.isYouth && <span title="Youth league">🧒</span>}
                      {!league.leaguesphereLeagueId && suggestions.length > 0 && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          Matches <strong>{suggestions[0].name}</strong> —{' '}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 0, minHeight: 'auto' }}
                            onClick={(e) => { e.stopPropagation(); onLink(league._id, suggestions[0].leaguesphereLeagueId); }}
                          >
                            Link
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{contactName(league.contactId)}</td>
                    <td>{league.estimatedTeamsCount || '—'} / {league.estimatedGamedaysCount || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--border-radius-md)',
                        fontSize: 'var(--font-size-xs)', background: stageStyle.bg, color: stageStyle.color,
                      }}>
                        {STAGE_LABELS[league.effectiveStatus.stage] || league.effectiveStatus.stage}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-color)' }} onClick={() => onDelete(league._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {selected.size > 0 && (
        <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          {selectionError && <div style={{ color: '#dc3545', fontSize: 'var(--font-size-sm)' }}>{selectionError}</div>}
          <button
            className="btn btn-primary"
            disabled={!!selectionError}
            onClick={() => {
              onCreateOfferFromSelected({
                ids: selectedLeagues.map((l) => l._id),
                contactId: selectedLeagues[0].contactId!,
                year: selectedLeagues[0].year,
                leaguesphereLeagueIds: selectedLeagues.map((l) => l.leaguesphereLeagueId!),
              });
              setSelected(new Set());
            }}
          >
            Create Offer from Selected ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}
