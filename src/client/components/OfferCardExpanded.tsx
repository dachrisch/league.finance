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
    <div style={{ padding: 'var(--spacing-lg)', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
      {/* Summary Info */}
      <div style={{ marginBottom: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-main)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', textTransform: 'uppercase' }}>Season</span>
            <strong>{seasonName}</strong>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-main)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', textTransform: 'uppercase' }}>Contact</span>
            <strong>{contactName}</strong>
          </div>
        </div>
        <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--text-main)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', textTransform: 'uppercase' }}>Leagues</span>
          <strong>{leagueNames.join(', ')}</strong>
        </div>
      </div>

      {/* League Configurations Table */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>League Pricing</h4>
        <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>League</th>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Model</th>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Rate</th>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Teams</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: idx === configs.length - 1 ? 'none' : '1px solid var(--border-color)' }}
                >
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{config.leagueName}</td>
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{config.costModel}</td>
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>€{(config.baseRateOverride ?? 50).toFixed(2)}</td>
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>{config.expectedTeamsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions & Revenue */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-md)' }}>
        <div style={{ textAlign: 'left' }}>
           <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', textTransform: 'uppercase' }}>Total Expected</span>
           <strong style={{ color: 'var(--primary-color)', fontSize: 'var(--font-size-md)' }}>€{totalRevenue.toFixed(2)}</strong>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {onViewDetails && (
            <button className="btn btn-primary btn-sm" onClick={onViewDetails}>
              View details
            </button>
          )}
          {onEdit && (
            <button className="btn btn-outline btn-sm" onClick={onEdit}>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
              onClick={onDelete}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
