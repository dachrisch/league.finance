// src/client/components/OfferCardExpanded.tsx
import { calculateTotalExpectedRevenue } from '../lib/offerHelpers';

export interface LeagueConfig {
  leagueId: number;
  leagueName: string;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
}

export interface OfferCardExpandedProps {
  seasonName: string;
  contactName: string;
  leagueNames: string[];
  configs: LeagueConfig[];
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function OfferCardExpanded({
  seasonName,
  contactName,
  leagueNames,
  configs,
  onViewDetails,
  onEdit,
  onDelete,
}: OfferCardExpandedProps) {
  const totalRevenue = calculateTotalExpectedRevenue(configs);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Summary Info */}
      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ marginBottom: '0.5rem', color: '#495057' }}>
          <strong>Season:</strong> {seasonName}
        </div>
        <div style={{ marginBottom: '0.5rem', color: '#495057' }}>
          <strong>Contact:</strong> {contactName}
        </div>
        <div style={{ color: '#495057' }}>
          <strong>Leagues:</strong> {leagueNames.join(', ')}
        </div>
      </div>

      {/* League Configurations Table */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>LEAGUE CONFIGURATIONS</h4>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>
                  League
                </th>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>
                  Cost Model
                </th>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>
                  Base Rate
                </th>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600' }}>
                  Expected Teams
                </th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                  }}
                >
                  <td style={{ padding: '0.5rem' }}>{config.leagueName}</td>
                  <td style={{ padding: '0.5rem' }}>
                    {config.costModel === 'SEASON' ? '⏱️ SEASON' : '📅 GAMEDAY'}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    €{(config.baseRateOverride ?? 50).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.5rem' }}>{config.expectedTeamsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Revenue */}
      <div
        style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          textAlign: 'right',
          fontWeight: '600',
          color: '#0d6efd',
        }}
      >
        Total Expected Revenue: €{totalRevenue.toFixed(2)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onViewDetails && (
          <button className="btn btn-primary btn-sm" onClick={onViewDetails}>
            View Details
          </button>
        )}
        {onEdit && (
          <button className="btn btn-secondary btn-sm" onClick={onEdit}>
            Edit
          </button>
        )}
        {onDelete && (
          <button
            className="btn btn-outline btn-sm"
            style={{ color: '#dc3545' }}
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
