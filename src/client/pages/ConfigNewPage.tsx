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
        className="btn-danger-text"
        style={{ marginBottom: '1rem', color: '#0d6efd', padding: 0, display: 'block' }}
      >
        ← Back to Dashboard
      </button>
      <h1 style={{ marginBottom: '2rem' }}>New Finance Config</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <div className="responsive-grid-2">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>League</span>
            <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} required style={{ padding: '8px' }}>
              <option value="">— select —</option>
              {leagues?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>Season</span>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} required style={{ padding: '8px' }}>
              <option value="">— select —</option>
              {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>Cost Model</span>
          <select value={costModel} onChange={(e) => setCostModel(e.target.value as 'SEASON' | 'GAMEDAY')} style={{ padding: '8px' }}>
            <option value="SEASON">Cost per team in season (Flat Fee)</option>
            <option value="GAMEDAY">Cost per team per gameday (Usage-based)</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>Base Rate Override (€)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={`System default: ${defaultRate ?? '—'} €`}
            value={baseRateOverride}
            onChange={(e) => setBaseRateOverride(e.target.value)}
            style={{ padding: '8px' }}
          />
        </label>

        <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '0.5rem 0' }} />

        {costModel === 'SEASON' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>Expected Teams Count</span>
            <input type="number" min="0" value={expectedTeamsCount} onChange={(e) => setExpectedTeamsCount(e.target.value)} style={{ padding: '8px' }} />
            <small style={{ color: '#666' }}>Used to project total potential revenue.</small>
          </label>
        )}

        {costModel === 'GAMEDAY' && (
          <div className="responsive-grid-2">
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Expected Gamedays</span>
              <input type="number" min="0" value={expectedGamedaysCount} onChange={(e) => setExpectedGamedaysCount(e.target.value)} style={{ padding: '8px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Teams per Gameday</span>
              <input type="number" min="0" value={expectedTeamsPerGameday} onChange={(e) => setExpectedTeamsPerGameday(e.target.value)} style={{ padding: '8px' }} />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={createConfig.isPending}
          style={{
            marginTop: '1rem',
            padding: '12px',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold'
          }}
        >
          {createConfig.isPending ? 'Creating…' : 'Create Configuration'}
        </button>
        {createConfig.isError && <p style={{ color: 'red', margin: 0 }}>{createConfig.error.message}</p>}
      </form>
    </div>
  );
}
