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
      <div className="container" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
        <h2 style={{ color: 'var(--danger-color)' }}>Access Denied</h2>
        <p>You must be an administrator to view this page.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
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
    <div className="container" style={{ maxWidth: 600, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn-outline"
        style={{ marginBottom: 'var(--spacing-lg)', display: 'inline-flex' }}
      >
        ← Back to Dashboard
      </button>
      <h1 style={{ marginBottom: 'var(--spacing-xl)', fontSize: '1.5rem', color: 'var(--primary-color)' }}>Global Settings</h1>

      <section className="card" style={{ background: 'var(--bg-secondary)' }}>
        <h2 style={{ margin: '0 0 var(--spacing-lg) 0', fontSize: 'var(--font-size-lg)' }}>Default Rates</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Default Rate per Team per Season (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ratePerSeason}
              onChange={(e) => setRatePerSeason(e.target.value)}
              className="form-control"
            />
            <small style={{ color: 'var(--text-muted)' }}>Used for FLAT fee calculations when no override is present.</small>
          </label>

          <label className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Default Rate per Team per Gameday (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ratePerGameday}
              onChange={(e) => setRatePerGameday(e.target.value)}
              className="form-control"
            />
            <small style={{ color: 'var(--text-muted)' }}>Used for usage-based calculations when no override is present.</small>
          </label>

          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="btn btn-primary"
            style={{ background: 'var(--success-color)', marginTop: 'var(--spacing-sm)' }}
          >
            {updateSettings.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          {updateSettings.isSuccess && <p style={{ color: 'var(--success-color)', margin: 0, fontWeight: 'var(--font-weight-medium)' }}>✓ Settings updated successfully.</p>}
          {updateSettings.isError && <p style={{ color: 'var(--danger-color)', margin: 0 }}>Error: {updateSettings.error.message}</p>}
        </form>
      </section>
    </div>
  );
}
