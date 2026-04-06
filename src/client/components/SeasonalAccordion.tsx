import React from 'react';
import { SeasonTable } from './SeasonTable';
import type { SeasonGroup } from '../lib/dashboardUtils';

interface Props {
  group: SeasonGroup;
  leagueNames: Record<number, string>;
  isExpanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

export function SeasonalAccordion({ group, leagueNames, isExpanded, onToggle, isAdmin, onDelete }: Props) {
  return (
    <div style={{ marginBottom: '1rem', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div 
        onClick={onToggle}
        style={{ 
          padding: '12px 20px', 
          background: isExpanded ? '#e9ecef' : '#fff', 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: '600'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.2rem' }}>{group.seasonName}</span>
          <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>
            {group.totalGross > 0 ? `Total Gross: ${group.totalGross.toFixed(2)} €` : ''}
          </span>
        </div>
        <span style={{ fontSize: '1.2rem', color: '#666' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>
      {isExpanded && (
        <div style={{ padding: '0' }}>
          <SeasonTable 
            rows={group.rows} 
            leagueNames={leagueNames} 
            isAdmin={isAdmin} 
            onDelete={onDelete} 
          />
        </div>
      )}
    </div>
  );
}
