import { Link, useNavigate } from 'react-router-dom';
import type { DashboardRow } from '../lib/dashboardUtils';

interface Props {
  rows: DashboardRow[];
  leagueNames: Record<number, string>;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

export function SeasonTable({ rows, leagueNames, isAdmin, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#f8f9fa', color: '#495057', fontSize: '0.9rem' }}>
        <tr>
          <th style={{ padding: '8px 12px', textAlign: 'left' }}>League</th>
          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Model / Status</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected Gross</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Live Gross</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net</th>
          <th style={{ padding: '8px 12px' }} />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          if (row.type === 'CONFIGURED') {
            const { config, stats } = row;
            return (
              <tr key={config._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px' }}>
                  <Link to={`/config/${config._id}`} style={{ fontWeight: '500', color: '#0d6efd', textDecoration: 'none' }}>
                    {leagueNames[config.leagueId] ?? config.leagueId}
                  </Link>
                </td>
                <td style={{ padding: '8px 12px' }}>{config.costModel}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.expectedGross.toFixed(2)} €</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.gross.toFixed(2)} €</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.net.toFixed(2)} €</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {isAdmin && (
                    <button onClick={() => onDelete(config._id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          } else {
            return (
              <tr key={`${row.leagueId}:${row.seasonId}`} style={{ borderBottom: '1px solid #dee2e6', background: '#fffef0' }}>
                <td style={{ padding: '8px 12px', color: '#664d03' }}>{row.leagueName}</td>
                <td style={{ padding: '8px 12px', fontStyle: 'italic', color: '#856404' }}>Pending ({row.gamedayCount} gamedays)</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#ccc' }}>—</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#ccc' }}>—</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#ccc' }}>—</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <button
                    onClick={() => navigate(`/config/new?league=${row.leagueId}&season=${row.seasonId}`)}
                    style={{ padding: '4px 8px', background: '#ffc107', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    + Create
                  </button>
                </td>
              </tr>
            );
          }
        })}
      </tbody>
    </table>
  );
}
