import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { DiscountForm } from '../components/DiscountForm';
import { DiscountList } from '../components/DiscountList';

export function ConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const { data, isLoading, refetch } = trpc.finance.configs.get.useQuery({ id: id! });
  const { data: stats } = trpc.finance.calculate.forConfig.useQuery({ configId: id! });
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();

  if (isLoading) return <p style={{ padding: '2rem' }}>Loading config…</p>;
  if (!data) return <p style={{ padding: '2rem', color: 'red' }}>Config not found.</p>;

  const { config, discounts } = data as any;
  const isAdmin = me?.role === 'admin';

  const league = leagues?.find(l => l.id === config.leagueId);
  const season = seasons?.find(s => s.id === config.seasonId);

  return (
    <div className="container">
      <button
        onClick={() => navigate('/dashboard')}
        className="btn-danger-text"
        style={{ marginBottom: '1.5rem', color: '#0d6efd', padding: 0, fontSize: 16, display: 'block' }}
      >
        ← Back to Dashboard
      </button>

      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>
          {league?.name ?? `League ${config.leagueId}`} / {season?.name ?? `Season ${config.seasonId}`}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', color: '#666', flexWrap: 'wrap' }}>
          <span>Model: <strong>{config.costModel}</strong></span>
          <span>Base Rate: <strong>{config.baseRateOverride != null ? `${config.baseRateOverride.toFixed(2)} €` : 'Default'}</strong></span>
        </div>
      </header>

      {stats && (
        <section className="responsive-flex" style={{ marginBottom: '2.5rem' }}>
          <div style={{ flex: 1, padding: '1.25rem', background: '#fff', borderRadius: 8, borderTop: '4px solid #0d6efd', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Gross</p>
            <h2 style={{ margin: 0, color: '#0d6efd' }}>{stats.gross.toFixed(2)} €</h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: 13, color: '#888' }}>
              {stats.liveParticipationCount} {config.costModel === 'SEASON' ? 'teams' : 'participations'}
            </p>
          </div>
          <div style={{ flex: 1, padding: '1.25rem', background: '#fff', borderRadius: 8, borderTop: '4px solid #dc3545', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Discount</p>
            <h2 style={{ margin: 0, color: '#dc3545' }}>-{stats.discount.toFixed(2)} €</h2>
          </div>
          <div style={{ flex: 1, padding: '1.25rem', background: '#fff', borderRadius: 8, borderTop: '4px solid #198754', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Net</p>
            <h2 style={{ margin: 0, color: '#198754' }}>{stats.net.toFixed(2)} €</h2>
          </div>
        </section>
      )}

      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Discounts</h3>
        <DiscountList discounts={discounts} isAdmin={isAdmin} onRemoved={refetch} />
        {isAdmin && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#fcfcfc', border: '1px dashed #ddd', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: 14, color: '#555' }}>Add new discount</h4>
            <DiscountForm configId={id!} onAdded={refetch} />
          </div>
        )}
      </section>

      {stats?.details && (
        <section>
          <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Per-Team Breakdown</h3>
          <table className="mobile-cards-table">
            <thead>
              <tr style={{ background: '#f8f9fa', color: '#495057' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Team Name</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Gross Fee</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Net Fee</th>
              </tr>
            </thead>
            <tbody>
              {stats.details.map((d: any) => (
                <tr key={d.teamId} style={{ borderBottom: '1px solid #eee' }}>
                  <td data-label="Team Name" style={{ padding: '12px 15px' }}>{d.teamName}</td>
                  <td data-label="Gross Fee" style={{ padding: '12px 15px', textAlign: 'right' }}>{d.gross.toFixed(2)} €</td>
                  <td data-label="Net Fee" style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 'bold', color: '#198754' }}>{d.net.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
