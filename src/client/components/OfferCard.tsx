// src/client/components/OfferCard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatusColor, getStatusLabel, getTimeAgoText } from '../lib/offerHelpers';

export interface OfferCardProps {
  id: string;
  associationName: string;
  seasonName: string;
  contactName: string;
  leagueCount: number;
  leagueNames: string[];
  status: 'draft' | 'sent' | 'accepted';
  createdAt: Date | string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  onSend?: () => void;
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
  children,
}: OfferCardProps) {
  const navigate = useNavigate();
  const statusColor = getStatusColor(status);

  return (
    <div
      style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        borderLeft: `4px solid ${statusColor}`,
        overflow: 'hidden',
        backgroundColor: '#fff',
        transition: 'box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Header with Association Name and Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderBottom: '1px solid #dee2e6',
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem', color: '#666' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
            {associationName}
          </h3>
        </div>
        <span
          style={{
            backgroundColor: statusColor,
            color: '#fff',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '600',
          }}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Collapsed Content */}
      {!isExpanded && (
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '0.5rem', color: '#495057' }}>
            <strong>Season:</strong> {seasonName}
          </div>
          <div style={{ marginBottom: '0.5rem', color: '#495057' }}>
            <strong>Contact:</strong> {contactName}
          </div>
          <div style={{ marginBottom: '1rem', color: '#495057' }}>
            <strong>Leagues:</strong> {leagueCount} selected
            {leagueCount > 0 && leagueNames.length > 0 && (
              <> ({leagueNames.slice(0, 3).join(', ')}{leagueCount > 3 ? '...' : ''})</>
            )}
          </div>
          <div style={{ color: '#999', fontSize: '0.875rem' }}>
            Created {getTimeAgoText(createdAt)}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/offers/${id}`);
              }}
            >
              View
            </button>
            {status === 'draft' && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSend?.();
                  }}
                >
                  Send
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: '#dc3545' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && children}
    </div>
  );
}
