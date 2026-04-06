import { Link } from 'react-router-dom';

interface ConfigRow {
  config: { _id: string; leagueId: number; seasonId: number; costModel: string };
  stats: { gross: number; discount: number; net: number; expectedGross: number; liveParticipationCount: number };
}

interface Props {
  rows: ConfigRow[];
  leagueNames: Record<number, string>;
  seasonNames: Record<number, string>;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

export function ConfigsTable({ rows, leagueNames, seasonNames, onDelete, isAdmin }: Props) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#e9ecef', color: '#495057' }}>
        <tr>
          <th style={{ padding: '8px 12px', textAlign: 'left' }}>League / Season</th>
          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Model</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected Gross</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Live Gross</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net</th>
          <th style={{ padding: '8px 12px' }} />
        </tr>
      </thead>
      <tbody>
        {rows.map(({ config, stats }) => (
          <tr key={config._id} style={{ borderBottom: '1px solid #dee2e6' }}>
            <td style={{ padding: '8px 12px' }}>
              <Link to={`/config/${config._id}`}>
                {leagueNames[config.leagueId] ?? config.leagueId} / {seasonNames[config.seasonId] ?? config.seasonId}
              </Link>
            </td>
            <td style={{ padding: '8px 12px' }}>{config.costModel}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.expectedGross.toFixed(2)} €</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.gross.toFixed(2)} €</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.net.toFixed(2)} €</td>
            <td style={{ padding: '8px 12px' }}>
              {isAdmin && (
                <button onClick={() => onDelete(config._id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
