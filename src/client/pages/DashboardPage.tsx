import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { SummaryCards } from '../components/SummaryCards';
import wizardStyles from '../styles/OfferWizard.module.css';

export function DashboardPage() {
  const navigate = useNavigate();

  // TRPC queries
  const { data: offers = [], isLoading: offersLoading } = trpc.finance.offers.list.useQuery();
  const { data: leagues = [] } = trpc.teams.leagues.useQuery();
  const { data: seasons = [] } = trpc.teams.seasons.useQuery();
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();

  // Lookup maps
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map(l => [l.id, l])), [leagues]);
  const assocMap = useMemo(() => Object.fromEntries(associations.map(a => [a._id, a])), [associations]);

  // Current season (latest by year)
  const currentSeason = useMemo(() => {
    if (!seasons.length) return null;
    return [...seasons].sort((a, b) => b.year - a.year)[0];
  }, [seasons]);

  // Financial Stats Calculation (Current Season, Sent/Accepted)
  const stats = useMemo(() => {
    const relevantOffers = offers.filter(o => 
      o.seasonId === currentSeason?._id && (o.status === 'sent' || o.status === 'accepted')
    );

    let gross = 0;
    let discount = 0;

    relevantOffers.forEach(offer => {
      // Each offer has configurations for multiple leagues
      offer.financialConfigs?.forEach((config: any) => {
        gross += config.finalPrice || 0;
      });
    });

    return {
      gross,
      discount, // We'll need a better way to track global discounts if they aren't part of offer.totalPrice
      net: gross - discount
    };
  }, [offers, currentSeason]);

  // Active Contracts: Leagues in current season that have a SENT or ACCEPTED offer
  const activeContracts = useMemo(() => {
    if (!currentSeason) return [];
    
    const results: any[] = [];
    const processedLeagueIds = new Set<number>();

    offers
      .filter(o => o.seasonId === currentSeason._id && (o.status === 'sent' || o.status === 'accepted'))
      .forEach(offer => {
        offer.leagueIds.forEach((lId: number) => {
          if (!processedLeagueIds.has(lId)) {
            const league = leagueMap[lId];
            const assoc = assocMap[offer.associationId];
            const config = offer.financialConfigs?.find((c: any) => c.leagueId === lId);
            
            results.push({
              leagueId: lId,
              leagueName: league?.name || `League ${lId}`,
              assocName: assoc?.name || 'Unknown',
              status: offer.status,
              offerId: offer._id,
              revenue: config?.finalPrice || 0
            });
            processedLeagueIds.add(lId);
          }
        });
      });
    
    return results.sort((a, b) => a.leagueName.localeCompare(b.leagueName));
  }, [offers, currentSeason, leagueMap, assocMap]);

  // Missing Contracts: Leagues in current season that have NO offer at all
  const missingContracts = useMemo(() => {
    if (!currentSeason || !leagues.length) return [];
    
    const contractedLeagueIds = new Set<number>();
    offers
      .filter(o => o.seasonId === currentSeason._id)
      .forEach(o => o.leagueIds.forEach((id: number) => contractedLeagueIds.add(id)));

    return leagues
      .filter(l => !contractedLeagueIds.has(l.id))
      .map(l => ({
        id: l.id,
        name: l.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [offers, currentSeason, leagues]);

  if (offersLoading) return <div className="container"><p>Loading dashboard...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <header style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)', fontWeight: 'var(--font-weight-semibold)' }}>
          Financial Overview
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          {currentSeason ? `Tracking Season ${currentSeason.year}` : 'No active season found'}
        </p>
      </header>

      {/* Global Stats */}
      <SummaryCards 
        totalGross={stats.gross}
        totalDiscount={stats.discount}
        totalNet={stats.net}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-xl)' }}>
        {/* Active Contracts Section */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Active Contracts</h2>
            <span className="chip active" style={{ borderRadius: '20px', padding: '2px 10px' }}>{activeContracts.length} Leagues</span>
          </div>
          
          <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: 'var(--spacing-md) var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>League</th>
                <th style={{ padding: 'var(--spacing-md) var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Association</th>
                <th style={{ padding: 'var(--spacing-md) var(--spacing-lg)', textAlign: 'right', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Revenue</th>
                <th style={{ padding: 'var(--spacing-md) var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeContracts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active contracts for this season.
                  </td>
                </tr>
              ) : (
                activeContracts.map((c) => (
                  <tr key={c.leagueId} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/offers/${c.offerId}`)}>
                    <td data-label="League" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                      <strong>{c.leagueName}</strong>
                    </td>
                    <td data-label="Association" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>{c.assocName}</td>
                    <td data-label="Revenue" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)' }}>{c.revenue.toFixed(2)} €</td>
                    <td data-label="Status" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', textAlign: 'center' }}>
                      <span className={`chip ${c.status === 'accepted' ? 'active' : ''}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>{c.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Missing Contracts Section */}
        <section className="card" style={{ padding: 0, overflow: 'hidden', borderStyle: missingContracts.length > 0 ? 'solid' : 'dashed' }}>
          <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', background: missingContracts.length > 0 ? '#fffef0' : 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: missingContracts.length > 0 ? '#856404' : 'inherit' }}>
              Missing Contracts
            </h2>
            {missingContracts.length > 0 && <span className="chip" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>Action Required</span>}
          </div>
          
          <div style={{ padding: 'var(--spacing-lg)' }}>
            {missingContracts.length === 0 ? (
              <p style={{ margin: 0, textAlign: 'center', color: 'var(--success-color)', padding: '1rem' }}>✓ All active leagues have associated offers.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                {missingContracts.map(league => (
                  <div key={league.id} className="summary-card" style={{ justifyContent: 'space-between', background: '#fffef0', borderColor: '#fde68a' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <span className="summary-card-label">League</span>
                      <strong className="summary-card-value" style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>{league.name}</strong>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/offers/new?league=${league.id}&season=${currentSeason?._id}`)}
                    >
                      + Offer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
