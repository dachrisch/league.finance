import { useNavigate } from 'react-router-dom';

interface PendingRow {
  leagueId: number;
  seasonId: number;
  leagueName: string;
  seasonName: string;
  gamedayCount: number;
}

interface Props {
  rows: PendingRow[];
}

export function PendingTable({ rows }: Props) {
  const navigate = useNavigate();
  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ color: '#664d03' }}>⚠ Unconfigured League/Seasons</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#fff3cd', color: '#664d03' }}>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>League / Season</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gamedays</th>
            <th style={{ padding: '8px 12px' }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.leagueId}:${row.seasonId}`} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '8px 12px' }}>{row.leagueName} / {row.seasonName}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.gamedayCount}</td>
              <td style={{ padding: '8px 12px' }}>
                <button
                  onClick={() => navigate(`/config/new?league=${row.leagueId}&season=${row.seasonId}`)}
                  style={{ padding: '4px 10px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  + Create Config
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
