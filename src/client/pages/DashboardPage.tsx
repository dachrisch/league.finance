import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { OfferCard } from '../components/OfferCard';
import { OfferCardExpanded } from '../components/OfferCardExpanded';

export function DashboardPage() {
  const navigate = useNavigate();
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'accepted'>('all');

  // TRPC queries
  const { data: offers, isLoading, refetch } = trpc.finance.offers.list.useQuery();
  const { data: associations } = trpc.finance.associations.list.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: leagues } = trpc.teams.leagues.useQuery();

  // Mutations
  const deleteOffer = trpc.finance.offers.delete.useMutation({
    onSuccess: () => refetch(),
  });

  // Build lookup maps
  const associationMap = useMemo(
    () => Object.fromEntries((associations || []).map((a: any) => [a._id, a])),
    [associations]
  );

  const seasonMap = useMemo(
    () => Object.fromEntries((seasons || []).map((s: any) => [s.id, s])),
    [seasons]
  );

  const leagueMap = useMemo(
    () => Object.fromEntries((leagues || []).map((l: any) => [l.id, l])),
    [leagues]
  );

  // Filter and transform offers
  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    return offers
      .filter((offer: any) => statusFilter === 'all' || offer.status === statusFilter)
      .map((offer: any) => {
        const assoc = associationMap[offer.associationId];
        const season = seasonMap[offer.seasonId];
        const leagueConfigs = (offer.financialConfigs || []).map((config: any) => {
          const league = leagueMap[config.leagueId];
          return {
            leagueId: config.leagueId,
            leagueName: league?.name || `League ${config.leagueId}`,
            costModel: config.costModel,
            baseRateOverride: config.baseRateOverride,
            expectedTeamsCount: config.expectedTeamsCount,
          };
        });

        return {
          id: offer._id,
          associationName: assoc?.name || 'Unknown Association',
          seasonName: season?.name || `Season ${offer.seasonId}`,
          contactName: offer.contact?.name || 'Unknown Contact',
          leagueCount: offer.leagueIds?.length || 0,
          leagueNames: offer.leagueIds
            ?.map((id: number) => leagueMap[id]?.name || `League ${id}`)
            .filter(Boolean) || [],
          status: offer.status,
          createdAt: offer.createdAt,
          sentAt: offer.sentAt,
          acceptedAt: offer.acceptedAt,
          configs: leagueConfigs,
        };
      });
  }, [offers, statusFilter, associationMap, seasonMap, leagueMap]);

  const handleDeleteOffer = (offerId: string) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      deleteOffer.mutate({ id: offerId });
    }
  };

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)', fontWeight: 'var(--font-weight-semibold)' }}>Offers Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Quick access to your pricing offers</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/offers/new')}
            className="btn btn-primary"
          >
            + Create New Offer
          </button>
          <button
            onClick={() => navigate('/associations')}
            className="btn btn-outline"
          >
            Associations
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          marginBottom: 'var(--spacing-xl)',
          display: 'flex',
          gap: 'var(--spacing-sm)',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <label style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 'var(--spacing-sm)' }}>Filter status:</label>
        {(['all', 'draft', 'sent', 'accepted'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`chip ${statusFilter === status ? 'active' : ''}`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <p>Loading offers...</p>
      ) : filteredOffers.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem var(--spacing-xl)',
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            borderStyle: 'dashed',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>📋</div>
          <h3 style={{ color: 'var(--text-main)', margin: '0 0 var(--spacing-sm) 0' }}>No offers yet</h3>
          <p style={{ margin: '0 0 var(--spacing-xl) 0' }}>Create your first offer to get started</p>
          <button
            onClick={() => navigate('/offers/new')}
            className="btn btn-primary"
          >
            + Create Your First Offer
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 'var(--spacing-lg)',
          }}
        >
          {filteredOffers.map((offer: any) => (
            <OfferCard
              key={offer.id}
              id={offer.id}
              associationName={offer.associationName}
              seasonName={offer.seasonName}
              contactName={offer.contactName}
              leagueCount={offer.leagueCount}
              leagueNames={offer.leagueNames}
              status={offer.status}
              createdAt={offer.createdAt}
              isExpanded={expandedOfferId === offer.id}
              onToggleExpand={() =>
                setExpandedOfferId(expandedOfferId === offer.id ? null : offer.id)
              }
              onDelete={() => handleDeleteOffer(offer.id)}
            >
              {expandedOfferId === offer.id && (
                <OfferCardExpanded
                  seasonName={offer.seasonName}
                  contactName={offer.contactName}
                  leagueNames={offer.leagueNames}
                  configs={offer.configs}
                  onViewDetails={() => navigate(`/offers/${offer.id}`)}
                />
              )}
            </OfferCard>
          ))}
        </div>
      )}
    </div>
  );
}
