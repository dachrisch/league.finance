// src/client/components/OfferCard.tsx
import { useNavigate } from 'react-router-dom';
import { getStatusColor, getStatusLabel, getTimeAgoText } from '../lib/offerHelpers';

export interface OfferCardProps {
  id: string;
  associationName: string;
  seasonName: string;
  contactName: string;
  leagueCount: number;
  leagueNames: string[];
  status: 'draft' | 'sending' | 'sent' | 'accepted';
  createdAt: Date | string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  onSend?: () => void;
  onView?: () => void;
  children?: React.ReactNode; // For expanded content
}

export function OfferCard({
  id,
  associationName,
  seasonName,
  contactName,
  leagueCount,
  leagueNames,
  status,
  createdAt,
  isExpanded,
  onToggleExpand,
  onDelete,
  onSend,
  onView,
  children,
}: OfferCardProps) {
  const navigate = useNavigate();
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
        boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'all var(--transition-normal)',
      }}
    >
      {/* Block Header Style */}
      <div
        style={{
          padding: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          cursor: 'pointer',
          background: isExpanded ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          transition: 'background var(--transition-normal)',
        }}
        onClick={onToggleExpand}
      >
        <div style={{ 
          width: '28px', 
          height: '28px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: statusColor,
          color: 'white',
          fontSize: '10px',
          fontWeight: 'var(--font-weight-semibold)',
          flexShrink: 0,
        }}>
          {status === 'accepted' ? '✓' : status === 'sent' ? '✉' : '✎'}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: 'var(--font-size-lg)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text-main)',
            }}>
              {associationName}
            </span>
            <span style={{ 
              fontSize: '8px', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              background: statusColor + '20', 
              color: statusColor,
              border: `1px solid ${statusColor}40`,
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              {statusLabel}
            </span>
          </div>
          <span style={{ 
            fontSize: 'var(--font-size-xs)', 
            color: 'var(--text-muted)',
            display: 'block',
            marginTop: '2px'
          }}>
            Season: {seasonName} · Contact: {contactName}
          </span>
        </div>
        
        <span style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: 'var(--text-muted)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform var(--transition-normal)',
        }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Body Content */}
      <div style={{ 
        overflow: 'hidden',
        transition: 'all var(--transition-normal)',
      }}>
        {isExpanded && children ? (
          children
        ) : (
          <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg) calc(28px + var(--spacing-md) + var(--spacing-lg))' }}>
            <div style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-main)' }}>
              <span style={{ fontWeight: 'bold' }}>Leagues:</span> {leagueCount} selected
              {leagueCount > 0 && leagueNames.length > 0 && (
                <span style={{ color: 'var(--text-muted)' }}> ({leagueNames.slice(0, 3).join(', ')}{leagueCount > 3 ? '...' : ''})</span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                Created {getTimeAgoText(createdAt)}
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView ? onView() : navigate(`/offers/${id}`);
                  }}
                >
                  View
                </button>
                {(status === 'draft' || status === 'sending') && onSend && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: 'var(--success-color)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSend();
                    }}
                    disabled={status === 'sending'}
                  >
                    Send
                  </button>
                )}
                {status === 'draft' && onDelete && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
