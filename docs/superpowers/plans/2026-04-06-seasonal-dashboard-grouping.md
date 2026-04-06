# Seasonal Dashboard Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Transform the financial dashboard into a seasonally-grouped accordion view that unifies configured and pending items.

**Architecture:** Data transformation will be handled in the frontend (`DashboardPage`). We'll introduce a `SeasonalAccordion` component to manage expansion states and a `SeasonTable` component to render the combined rows for each season.

**Tech Stack:** React 19, TypeScript, tRPC, Vanilla CSS.

---

### Task 1: Type Definitions and Data Grouping Logic

**Files:**
- Create: `src/client/lib/dashboardUtils.ts`
- Create: `src/client/lib/__tests__/dashboardUtils.test.ts`

- [x] **Step 1: Write types and grouping function**

Create `src/client/lib/dashboardUtils.ts`:

```ts
import type { FinancialConfig, CalculationResult } from '../../shared/types';

export type DashboardRow = 
  | { type: 'CONFIGURED'; config: any; stats: any }
  | { type: 'PENDING'; leagueId: number; seasonId: number; leagueName: string; seasonName: string; gamedayCount: number };

export interface SeasonGroup {
  seasonId: number;
  seasonName: string;
  rows: DashboardRow[];
  totalGross: number;
}

export function groupDashboardData(
  configStats: any[],
  pending: any[],
  seasonNames: Record<number, string>,
  leagueNames: Record<number, string>
): SeasonGroup[] {
  const groups = new Map<number, SeasonGroup>();

  for (const item of configStats) {
    const seasonId = item.config.seasonId;
    if (!groups.has(seasonId)) {
      groups.set(seasonId, {
        seasonId,
        seasonName: seasonNames[seasonId] || `Season ${seasonId}`,
        rows: [],
        totalGross: 0,
      });
    }
    const group = groups.get(seasonId)!;
    group.rows.push({ type: 'CONFIGURED', ...item });
    group.totalGross += item.stats.gross;
  }

  for (const item of pending) {
    const seasonId = item.seasonId;
    if (!groups.has(seasonId)) {
      groups.set(seasonId, {
        seasonId,
        seasonName: item.seasonName || `Season ${seasonId}`,
        rows: [],
        totalGross: 0,
      });
    }
    const group = groups.get(seasonId)!;
    group.rows.push({ type: 'PENDING', ...item });
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => b.seasonId - a.seasonId);

  for (const group of sortedGroups) {
    group.rows.sort((a, b) => {
      const nameA = a.type === 'CONFIGURED' ? (leagueNames[a.config.leagueId] || '') : a.leagueName;
      const nameB = b.type === 'CONFIGURED' ? (leagueNames[b.config.leagueId] || '') : b.leagueName;
      return nameA.localeCompare(nameB);
    });
  }

  return sortedGroups;
}
```

- [x] **Step 2: Write tests for grouping logic**

Create `src/client/lib/__tests__/dashboardUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupDashboardData } from '../dashboardUtils';

describe('groupDashboardData', () => {
  it('groups configured and pending items by season', () => {
    const configStats = [
      { config: { seasonId: 1, leagueId: 10 }, stats: { gross: 100 } },
    ];
    const pending = [
      { seasonId: 1, leagueId: 11, leagueName: 'League B', seasonName: 'Season 1', gamedayCount: 5 },
      { seasonId: 2, leagueId: 12, leagueName: 'League C', seasonName: 'Season 2', gamedayCount: 3 },
    ];
    const seasonNames = { 1: 'Season 1', 2: 'Season 2' };
    const leagueNames = { 10: 'League A', 11: 'League B', 12: 'League C' };

    const result = groupDashboardData(configStats, pending, seasonNames, leagueNames);

    expect(result).toHaveLength(2);
    expect(result[0].seasonId).toBe(2); // Season 2 first
    expect(result[1].seasonId).toBe(1);
    expect(result[1].rows).toHaveLength(2);
    expect(result[1].totalGross).toBe(100);
  });
});
```

- [x] **Step 3: Run tests**

Run: `npm test src/client/lib/__tests__/dashboardUtils.test.ts`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add src/client/lib/
git commit -m "feat: dashboard data grouping and sorting utility"
```

---

### Task 2: SeasonalAccordion and SeasonTable Components

**Files:**
- Create: `src/client/components/SeasonalAccordion.tsx`
- Create: `src/client/components/SeasonTable.tsx`

- [x] **Step 1: Write `SeasonTable` component**

Create `src/client/components/SeasonTable.tsx`:

```tsx
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
```

- [x] **Step 2: Write `SeasonalAccordion` component**

Create `src/client/components/SeasonalAccordion.tsx`:

```tsx
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
```

- [x] **Step 3: Commit**

```bash
git add src/client/components/SeasonalAccordion.tsx src/client/components/SeasonTable.tsx
git commit -m "feat: SeasonalAccordion and SeasonTable components"
```

---

### Task 3: Integrate into DashboardPage

**Files:**
- Modify: `src/client/pages/DashboardPage.tsx`

- [x] **Step 1: Update `DashboardPage` to use grouped data and state**

```tsx
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Financial Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {me?.role === 'admin' && (
            <>
              <button onClick={() => navigate('/config/new')} style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                + New Config
              </button>
              <button onClick={() => navigate('/settings')} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Settings
              </button>
            </>
          )}
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'none', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }}>
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
```

- [x] **Step 2: Remove obsolete components**

Delete: `src/client/components/ConfigsTable.tsx`
Delete: `src/client/components/PendingTable.tsx`

- [x] **Step 3: Commit**

```bash
git rm src/client/components/ConfigsTable.tsx src/client/components/PendingTable.tsx
git add src/client/pages/DashboardPage.tsx
git commit -m "feat: integrated unified seasonal grouping into DashboardPage"
```

---

### Task 4: Verification

- [x] **Step 1: Check build**

Run: `npm run build`
Expected: Success

- [x] **Step 2: Manual Check (Mental/Visual)**
Verify that seasons are sorted DESC, leagues within them are sorted ASC by name, and "Pending" rows are visually distinct but part of the same table.

- [x] **Step 3: Commit**
```bash
git commit --allow-empty -m "chore: verified seasonal grouping implementation"
```
