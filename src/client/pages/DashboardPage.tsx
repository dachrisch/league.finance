import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc, clearToken } from '../lib/trpc';
import { SummaryCards } from '../components/SummaryCards';
import { SeasonalAccordion } from '../components/SeasonalAccordion';
import { groupDashboardData } from '../lib/dashboardUtils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const { data, isLoading, refetch } = trpc.finance.dashboard.summary.useQuery();
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const deleteConfig = trpc.finance.configs.delete.useMutation({ onSuccess: () => refetch() });

  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());

  const leagueNames: Record<number, string> = Object.fromEntries((leagues ?? []).map((l) => [l.id, l.name]));
  const seasonNames: Record<number, string> = Object.fromEntries((seasons ?? []).map((s) => [s.id, s.name]));

  // Process data
  const groupedData = data 
    ? groupDashboardData(data.configStats, data.pending, seasonNames, leagueNames)
    : [];

  // Default expansion: first season
  useEffect(() => {
    if (groupedData.length > 0 && expandedSeasons.size === 0) {
      setExpandedSeasons(new Set([groupedData[0].seasonId]));
    }
  }, [groupedData]);

  function toggleSeason(id: number) {
    const next = new Set(expandedSeasons);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSeasons(next);
  }

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p>Error loading dashboard.</p>;

  return (
    <div className="container">
      <div className="responsive-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Financial Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {me?.role === 'admin' && (
            <>
              <button onClick={() => navigate('/config/new')} className="btn btn-primary">
                + New Config
              </button>
              <button onClick={() => navigate('/settings')} className="btn btn-secondary">
                Settings
              </button>
            </>
          )}
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </div>

      <SummaryCards totalGross={data.totalGross} totalDiscount={data.totalDiscount} totalNet={data.totalNet} />
      
      {groupedData.map((group) => (
        <SeasonalAccordion 
          key={group.seasonId}
          group={group}
          leagueNames={leagueNames}
          isAdmin={me?.role === 'admin'}
          isExpanded={expandedSeasons.has(group.seasonId)}
          onToggle={() => toggleSeason(group.seasonId)}
          onDelete={(id) => deleteConfig.mutate({ id })}
        />
      ))}
    </div>
  );
}
