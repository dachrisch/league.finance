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

  if (isLoading) return <div className="container"><p>Loading config…</p></div>;
  if (!data) return <div className="container"><p style={{ color: 'var(--danger-color)' }}>Config not found.</p></div>;

  const { config, discounts } = data as any;
  const isAdmin = me?.role === 'admin';

  const league = leagues?.find(l => l.id === config.leagueId);
  const season = seasons?.find(s => s.id === config.seasonId);

  return (
    <div className="container">
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn-outline"
        style={{ marginBottom: 'var(--spacing-lg)', display: 'inline-flex' }}
      >
        ← Back to Dashboard
      </button>

      <header style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1.5rem', color: 'var(--primary-color)' }}>
          {league?.name ?? `League ${config.leagueId}`} / {season?.name ?? `Season ${config.seasonId}`}
        </h1>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', color: 'var(--text-muted)', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)' }}>
          <span>Model: <strong>{config.costModel}</strong></span>
          <span>Base Rate: <strong>{config.baseRateOverride != null ? `${config.baseRateOverride.toFixed(2)} €` : 'Default'}</strong></span>
        </div>
      </header>

      {stats && (
        <section className="responsive-flex" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="summary-card" style={{ flex: 1 }}>
            <div className="summary-card-icon" style={{ color: 'var(--primary-color)', background: 'var(--primary-color)15' }}>G</div>
            <div>
              <span className="summary-card-label">Live Gross</span>
              <strong className="summary-card-value">{stats.gross.toFixed(2)} €</strong>
              <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                {stats.liveParticipationCount} {config.costModel === 'SEASON' ? 'teams' : 'participations'}
              </p>
            </div>
          </div>
          <div className="summary-card" style={{ flex: 1 }}>
            <div className="summary-card-icon" style={{ color: 'var(--danger-color)', background: 'var(--danger-color)15' }}>D</div>
            <div>
              <span className="summary-card-label">Total Discount</span>
              <strong className="summary-card-value" style={{ color: 'var(--danger-color)' }}>-{stats.discount.toFixed(2)} €</strong>
            </div>
          </div>
          <div className="summary-card" style={{ flex: 1 }}>
            <div className="summary-card-icon" style={{ color: 'var(--success-color)', background: 'var(--success-color)15' }}>N</div>
            <div>
              <span className="summary-card-label">Live Net</span>
              <strong className="summary-card-value" style={{ color: 'var(--success-color)' }}>{stats.net.toFixed(2)} €</strong>
            </div>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>Discounts</h3>
        <DiscountList discounts={discounts} isAdmin={isAdmin} onRemoved={refetch} />
        {isAdmin && (
          <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
            <h4 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Add new discount</h4>
            <DiscountForm configId={id!} onAdded={refetch} />
          </div>
        )}
      </section>

      {stats?.details && (
        <section>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>Per-Team Breakdown</h3>
          <table className="mobile-cards-table" style={{ background: 'var(--bg-primary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                <th style={{ padding: 'var(--spacing-md)', textAlign: 'left', borderBottom: '2px solid var(--border-color)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Team Name</th>
                <th style={{ padding: 'var(--spacing-md)', textAlign: 'right', borderBottom: '2px solid var(--border-color)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Gross Fee</th>
                <th style={{ padding: 'var(--spacing-md)', textAlign: 'right', borderBottom: '2px solid var(--border-color)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Net Fee</th>
              </tr>
            </thead>
            <tbody>
              {stats.details.map((d: any) => (
                <tr key={d.teamId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td data-label="Team Name" style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-md)' }}>{d.teamName}</td>
                  <td data-label="Gross Fee" style={{ padding: 'var(--spacing-md)', textAlign: 'right', fontSize: 'var(--font-size-md)' }}>{d.gross.toFixed(2)} €</td>
                  <td data-label="Net Fee" style={{ padding: 'var(--spacing-md)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)', color: 'var(--success-color)', fontSize: 'var(--font-size-md)' }}>{d.net.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
