import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function ConfigNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: settings } = trpc.finance.settings.get.useQuery();
  const createConfig = trpc.finance.configs.create.useMutation({
    onSuccess: (config) => navigate(`/config/${(config as any)._id}`),
  });

  const [leagueId, setLeagueId] = useState(params.get('league') ?? '');
  const [seasonId, setSeasonId] = useState(params.get('season') ?? '');
  const [costModel, setCostModel] = useState<'SEASON' | 'GAMEDAY'>('SEASON');
  const [baseRateOverride, setBaseRateOverride] = useState('');
  const [expectedTeamsCount, setExpectedTeamsCount] = useState('0');
  const [expectedGamedaysCount, setExpectedGamedaysCount] = useState('0');
  const [expectedTeamsPerGameday, setExpectedTeamsPerGameday] = useState('0');

  const defaultRate = costModel === 'SEASON'
    ? settings?.defaultRatePerTeamSeason
    : settings?.defaultRatePerTeamGameday;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createConfig.mutate({
      leagueId: Number(leagueId),
      seasonId: Number(seasonId),
      costModel,
      baseRateOverride: baseRateOverride ? Number(baseRateOverride) : null,
      expectedTeamsCount: Number(expectedTeamsCount),
      expectedGamedaysCount: Number(expectedGamedaysCount),
      expectedTeamsPerGameday: Number(expectedTeamsPerGameday),
    });
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn-outline"
        style={{ marginBottom: 'var(--spacing-lg)', display: 'inline-flex' }}
      >
        ← Back to Dashboard
      </button>
      <h1 style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1.5rem', color: 'var(--primary-color)' }}>New Finance Config</h1>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div className="responsive-grid-2">
          <label className="form-group">
            <span className="form-label">League</span>
            <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} required className="form-control">
              <option value="">— select —</option>
              {leagues?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Season</span>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} required className="form-control">
              <option value="">— select —</option>
              {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <label className="form-group">
          <span className="form-label">Cost Model</span>
          <select value={costModel} onChange={(e) => setCostModel(e.target.value as 'SEASON' | 'GAMEDAY')} className="form-control">
            <option value="SEASON">Cost per team in season (Flat Fee)</option>
            <option value="GAMEDAY">Cost per team per gameday (Usage-based)</option>
          </select>
        </label>

        <label className="form-group">
          <span className="form-label">Base Rate Override (€)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={`System default: ${defaultRate ?? '—'} €`}
            value={baseRateOverride}
            onChange={(e) => setBaseRateOverride(e.target.value)}
            className="form-control"
          />
        </label>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--spacing-xs) 0' }} />

        {costModel === 'SEASON' && (
          <label className="form-group">
            <span className="form-label">Expected Teams Count</span>
            <input type="number" min="0" value={expectedTeamsCount} onChange={(e) => setExpectedTeamsCount(e.target.value)} className="form-control" />
            <small style={{ color: 'var(--text-muted)' }}>Used to project total potential revenue.</small>
          </label>
        )}

        {costModel === 'GAMEDAY' && (
          <div className="responsive-grid-2">
            <label className="form-group">
              <span className="form-label">Expected Gamedays</span>
              <input type="number" min="0" value={expectedGamedaysCount} onChange={(e) => setExpectedGamedaysCount(e.target.value)} className="form-control" />
            </label>
            <label className="form-group">
              <span className="form-label">Teams per Gameday</span>
              <input type="number" min="0" value={expectedTeamsPerGameday} onChange={(e) => setExpectedTeamsPerGameday(e.target.value)} className="form-control" />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={createConfig.isPending}
          className="btn btn-primary"
        >
          {createConfig.isPending ? 'Creating…' : 'Create Configuration'}
        </button>
        {createConfig.isError && <p style={{ color: 'var(--danger-color)', margin: 0 }}>{createConfig.error.message}</p>}
      </form>
    </div>
  );
}
