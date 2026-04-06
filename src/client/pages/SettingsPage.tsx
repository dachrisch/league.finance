import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: settings, refetch } = trpc.finance.settings.get.useQuery();
  const updateSettings = trpc.finance.settings.update.useMutation({ onSuccess: () => refetch() });

  const [ratePerSeason, setRatePerSeason] = useState('');
  const [ratePerGameday, setRatePerGameday] = useState('');

  useEffect(() => {
    if (settings) {
      setRatePerSeason(String(settings.defaultRatePerTeamSeason));
      setRatePerGameday(String(settings.defaultRatePerTeamGameday));
    }
  }, [settings]);

  if (me?.role !== 'admin') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'red' }}>Access Denied</h2>
        <p>You must be an administrator to view this page.</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateSettings.mutate({
      defaultRatePerTeamSeason: Number(ratePerSeason),
      defaultRatePerTeamGameday: Number(ratePerGameday),
    });
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', color: '#0d6efd', padding: 0 }}
      >
        ← Back to Dashboard
      </button>
      <h1 style={{ marginBottom: '2rem' }}>Global Settings</h1>

      <section style={{ background: '#f8f9fa', padding: '2rem', borderRadius: 12 }}>
        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: 20 }}>Default Rates</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>Default Rate per Team per Season (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ratePerSeason}
              onChange={(e) => setRatePerSeason(e.target.value)}
              style={{ padding: '10px', fontSize: 16 }}
            />
            <small style={{ color: '#666' }}>Used for FLAT fee calculations when no override is present.</small>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>Default Rate per Team per Gameday (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ratePerGameday}
              onChange={(e) => setRatePerGameday(e.target.value)}
              style={{ padding: '10px', fontSize: 16 }}
            />
            <small style={{ color: '#666' }}>Used for usage-based calculations when no override is present.</small>
          </label>

          <button
            type="submit"
            disabled={updateSettings.isPending}
            style={{
              marginTop: '1rem',
              padding: '12px',
              background: '#198754',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 'bold'
            }}
          >
            {updateSettings.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          {updateSettings.isSuccess && <p style={{ color: '#198754', margin: 0, fontWeight: 'bold' }}>✓ Settings updated successfully.</p>}
          {updateSettings.isError && <p style={{ color: '#dc3545', margin: 0 }}>Error: {updateSettings.error.message}</p>}
        </form>
      </section>
    </div>
  );
}
