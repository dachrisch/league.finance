# Offer-First Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the league/season dashboard with an offers-first dashboard showing Offer as the primary entity with expandable league configurations, implement the 3-step offer creation wizard with inline Association/Contact creation, and build the Associations management page.

**Architecture:** 
- Frontend-driven: All UI components are React components with TRPC hooks for API calls
- Reusable forms: AssociationForm and ContactForm are used inline during wizard and standalone
- Offer cards: Collapsed and expanded states managed by component state
- Dashboard: Single offers grid replaces all league/season grouping

**Tech Stack:** 
- React 19, TypeScript, TRPC, Zod validation
- React Router for navigation
- CSS for styling (existing patterns in codebase)

---

## Phase 1: Utility Functions & Helpers

### Task 1: Create Offer Helper Functions

**Files:**
- Create: `src/client/lib/offerHelpers.ts`

- [ ] **Step 1: Write helper functions for offer display logic**

```typescript
// src/client/lib/offerHelpers.ts
import { Types } from 'mongoose';

export interface OfferDisplay {
  id: string;
  associationName: string;
  seasonId: number;
  seasonName?: string;
  contactName: string;
  leagueCount: number;
  leagueNames: string[];
  status: 'draft' | 'sent' | 'accepted';
  createdAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
}

export function calculateTotalExpectedRevenue(
  configs: Array<{ expectedTeamsCount: number; baseRateOverride: number | null }> = []
): number {
  return configs.reduce((sum, config) => {
    const rate = config.baseRateOverride ?? 50; // fallback to 50
    return sum + rate * config.expectedTeamsCount;
  }, 0);
}

export function getStatusColor(status: 'draft' | 'sent' | 'accepted'): string {
  switch (status) {
    case 'draft':
      return '#ffc107'; // yellow
    case 'sent':
      return '#0d6efd'; // blue
    case 'accepted':
      return '#198754'; // green
    default:
      return '#6c757d'; // gray
  }
}

export function getStatusLabel(status: 'draft' | 'sent' | 'accepted'): string {
  return status.toUpperCase();
}

export function formatDate(date?: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTimeAgoText(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/lib/offerHelpers.ts
git commit -m "feat(utils): add offer display helper functions"
```

---

## Phase 2: Offer Card Components

### Task 2: Create OfferCard Component (Collapsed State)

**Files:**
- Create: `src/client/components/OfferCard.tsx`

- [ ] **Step 1: Create collapsed offer card component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/OfferCard.tsx
git commit -m "feat(components): add collapsed offer card component"
```

---

### Task 3: Create OfferCardExpanded Component

**Files:**
- Create: `src/client/components/OfferCardExpanded.tsx`

- [ ] **Step 1: Create expanded card content with configs table**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/OfferCardExpanded.tsx
git commit -m "feat(components): add expanded offer card with configs table"
```

---

## Phase 3: Form Components for Inline Creation

### Task 4: Create AssociationForm Component

**Files:**
- Create: `src/client/components/AssociationForm.tsx`

- [ ] **Step 1: Create inline association form**

```typescript
// src/client/components/AssociationForm.tsx
import { useState } from 'react';

export interface AssociationFormProps {
  onSubmit: (data: { name: string; description: string; email: string; phone: string }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function AssociationForm({ onSubmit, onCancel, isLoading = false }: AssociationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Association name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || 'Failed to create association');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{ color: '#dc3545', fontSize: '0.875rem', padding: '0.5rem' }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Association Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Northern Region Leagues"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional details about this association"
          rows={2}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="contact@association.local"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+1 555-0123"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Association'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/AssociationForm.tsx
git commit -m "feat(components): add inline association creation form"
```

---

### Task 5: Create ContactForm Component

**Files:**
- Create: `src/client/components/ContactForm.tsx`

- [ ] **Step 1: Create inline contact form**

```typescript
// src/client/components/ContactForm.tsx
import { useState } from 'react';

export interface ContactFormProps {
  onSubmit: (data: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ContactForm({ onSubmit, onCancel, isLoading = false }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Contact name is required');
      return;
    }

    if (!formData.street.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
      setError('Address is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || 'Failed to create contact');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{ color: '#dc3545', fontSize: '0.875rem', padding: '0.5rem' }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Contact Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="street" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Street *
        </label>
        <input
          type="text"
          id="street"
          name="street"
          value={formData.street}
          onChange={handleChange}
          placeholder="123 Main St"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="city" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            City *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="New York"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="postalCode" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Postal Code *
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            placeholder="10001"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="country" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Country *
        </label>
        <input
          type="text"
          id="country"
          name="country"
          value={formData.country}
          onChange={handleChange}
          placeholder="United States"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Contact'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/ContactForm.tsx
git commit -m "feat(components): add inline contact creation form"
```

---

### Task 6: Create ContactGrid Component

**Files:**
- Create: `src/client/components/ContactGrid.tsx`

- [ ] **Step 1: Create selectable contact grid for wizard step 2**

```typescript
// src/client/components/ContactGrid.tsx

export interface Contact {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface ContactGridProps {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contactId: string) => void;
  isLoading?: boolean;
}

export function ContactGrid({ contacts, selectedId, onSelect, isLoading = false }: ContactGridProps) {
  if (contacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
        No contacts created yet. Create your first contact below.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}
    >
      {contacts.map((contact) => (
        <div
          key={contact._id}
          onClick={() => !isLoading && onSelect(contact._id)}
          style={{
            padding: '1rem',
            border: selectedId === contact._id ? '2px solid #0d6efd' : '1px solid #dee2e6',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            backgroundColor: selectedId === contact._id ? '#f0f8ff' : '#fff',
            transition: 'all 0.2s',
            opacity: isLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading && selectedId !== contact._id) {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#0d6efd';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(13,110,253,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && selectedId !== contact._id) {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#dee2e6';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{contact.name}</div>
          <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.4' }}>
            {contact.address.street}
            <br />
            {contact.address.city}, {contact.address.postalCode}
            <br />
            {contact.address.country}
          </div>
          {selectedId === contact._id && (
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <span style={{ color: '#0d6efd', fontWeight: '600', fontSize: '0.875rem' }}>
                ✓ Selected
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/ContactGrid.tsx
git commit -m "feat(components): add selectable contact grid for wizard"
```

---

## Phase 4: Offer Creation Wizard (3-Step)

### Task 7: Rewrite OfferCreateWizard Component

**Files:**
- Modify: `src/client/components/OfferCreateWizard.tsx`

- [ ] **Step 1: Read current wizard file to understand structure**

```bash
cat src/client/components/OfferCreateWizard.tsx | head -50
```

Expected: Shows current implementation (may be incomplete or different)

- [ ] **Step 2: Rewrite wizard with 3 steps and inline creation**

Replace the entire file with:

```typescript
// src/client/components/OfferCreateWizard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { AssociationForm } from './AssociationForm';
import { ContactForm } from './ContactForm';
import { ContactGrid } from './ContactGrid';

type WizardStep = 1 | 2 | 3;

interface WizardState {
  associationId: string;
  seasonId: number;
  contactId: string;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  selectedLeagueIds: number[];
}

export function OfferCreateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<WizardState>({
    associationId: '',
    seasonId: 0,
    contactId: '',
    costModel: 'SEASON',
    baseRateOverride: null,
    expectedTeamsCount: 0,
    selectedLeagueIds: [],
  });

  const [showNewAssociation, setShowNewAssociation] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // TRPC queries & mutations
  const { data: associations, isLoading: loadingAssociations } = trpc.finance.associations.list.useQuery();
  const { data: contacts, refetch: refetchContacts } = trpc.finance.contacts.list.useQuery();
  const { data: seasons, isLoading: loadingSeasons } = trpc.teams.seasons.useQuery();
  const { data: leagues, isLoading: loadingLeagues } = trpc.teams.leagues.useQuery();

  const createAssociation = trpc.finance.associations.create.useMutation();
  const createContact = trpc.finance.contacts.create.useMutation();
  const createOffer = trpc.finance.offers.create.useMutation();

  // Step 1: Association & Season
  const handleAssociationCreated = async (data: any) => {
    setIsLoading(true);
    try {
      const result = await createAssociation.mutateAsync(data);
      setState((prev) => ({ ...prev, associationId: result._id }));
      setShowNewAssociation(false);
    } catch (err) {
      console.error('Failed to create association:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Continue = () => {
    if (!state.associationId || !state.seasonId) {
      alert('Please select an association and season');
      return;
    }
    setStep(2);
  };

  // Step 2: Contact
  const handleContactCreated = async (data: any) => {
    setIsLoading(true);
    try {
      const result = await createContact.mutateAsync(data);
      setState((prev) => ({ ...prev, contactId: result._id }));
      await refetchContacts();
      setShowNewContact(false);
    } catch (err) {
      console.error('Failed to create contact:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Continue = () => {
    if (!state.contactId) {
      alert('Please select a contact');
      return;
    }
    setStep(3);
  };

  // Step 3: Pricing & Leagues
  const handleCreateOffer = async () => {
    if (state.selectedLeagueIds.length === 0) {
      alert('Please select at least one league');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createOffer.mutateAsync({
        associationId: state.associationId,
        seasonId: state.seasonId,
        contactId: state.contactId,
        leagueIds: state.selectedLeagueIds,
        costModel: state.costModel,
        baseRateOverride: state.baseRateOverride,
        expectedTeamsCount: state.expectedTeamsCount,
      });
      navigate(`/offers/${result._id}`);
    } catch (err: any) {
      alert(`Failed to create offer: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAssociation = associations?.find((a: any) => a._id === state.associationId);
  const selectedSeason = seasons?.find((s: any) => s.id === state.seasonId);
  const selectedContact = contacts?.find((c: any) => c._id === state.contactId);
  const selectedLeagueNames = (leagues || [])
    .filter((l: any) => state.selectedLeagueIds.includes(l.id))
    .map((l: any) => l.name);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create New Offer</h1>

      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              padding: '0.75rem',
              textAlign: 'center',
              backgroundColor: s <= step ? '#0d6efd' : '#e9ecef',
              color: s <= step ? '#fff' : '#6c757d',
              borderRadius: '4px',
              fontWeight: '500',
            }}
          >
            Step {s}
          </div>
        ))}
      </div>

      {/* STEP 1: Association & Season */}
      {step === 1 && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Step 1: Select Association & Season</h2>

          {!showNewAssociation ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Association *
                </label>
                <select
                  value={state.associationId}
                  onChange={(e) => setState((prev) => ({ ...prev, associationId: e.target.value }))}
                  disabled={isLoading || loadingAssociations}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">-- Select Association --</option>
                  {(associations || []).map((a: any) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewAssociation(true)}
                  disabled={isLoading}
                >
                  + Create New Association
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Association</h3>
              <AssociationForm
                onSubmit={handleAssociationCreated}
                onCancel={() => setShowNewAssociation(false)}
                isLoading={isLoading}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Season *
            </label>
            <select
              value={state.seasonId}
              onChange={(e) => setState((prev) => ({ ...prev, seasonId: parseInt(e.target.value) }))}
              disabled={isLoading || loadingSeasons}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              <option value={0}>-- Select Season --</option>
              {(seasons || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/offers')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStep1Continue}
              disabled={isLoading}
            >
              Next: Select Contact
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Contact */}
      {step === 2 && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Step 2: Select or Create Contact</h2>

          {!showNewContact ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Select Existing Contact</h3>
                <ContactGrid
                  contacts={contacts || []}
                  selectedId={state.contactId}
                  onSelect={(id) => setState((prev) => ({ ...prev, contactId: id }))}
                  isLoading={isLoading}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewContact(true)}
                  disabled={isLoading}
                >
                  + Create New Contact
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Contact</h3>
              <ContactForm
                onSubmit={handleContactCreated}
                onCancel={() => setShowNewContact(false)}
                isLoading={isLoading}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(1)}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStep2Continue}
              disabled={isLoading}
            >
              Next: Set Pricing & Leagues
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pricing & Leagues */}
      {step === 3 && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Step 3: Set Pricing & Select Leagues</h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Review Your Selections</h4>
            <div style={{ fontSize: '0.875rem', color: '#495057' }}>
              <div><strong>Association:</strong> {selectedAssociation?.name}</div>
              <div><strong>Season:</strong> {selectedSeason?.name}</div>
              <div><strong>Contact:</strong> {selectedContact?.name}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Cost Model
            </label>
            <select
              value={state.costModel}
              onChange={(e) => setState((prev) => ({ ...prev, costModel: e.target.value as 'SEASON' | 'GAMEDAY' }))}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              <option value="SEASON">Season Flat Fee</option>
              <option value="GAMEDAY">Per Game Day</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Base Rate Override (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.baseRateOverride || ''}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  baseRateOverride: e.target.value ? parseFloat(e.target.value) : null,
                }))
              }
              placeholder="Leave empty for default (€50)"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Expected Teams Count
            </label>
            <input
              type="number"
              min="0"
              value={state.expectedTeamsCount}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  expectedTeamsCount: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>
              Select Leagues * ({state.selectedLeagueIds.length} selected)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(leagues || []).map((league: any) => (
                <div key={league.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id={`league-${league.id}`}
                    checked={state.selectedLeagueIds.includes(league.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setState((prev) => ({
                          ...prev,
                          selectedLeagueIds: [...prev.selectedLeagueIds, league.id],
                        }));
                      } else {
                        setState((prev) => ({
                          ...prev,
                          selectedLeagueIds: prev.selectedLeagueIds.filter((id) => id !== league.id),
                        }));
                      }
                    }}
                    disabled={isLoading}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label htmlFor={`league-${league.id}`} style={{ cursor: 'pointer', flex: 1 }}>
                    {league.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(2)}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateOffer}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Offer (Draft)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify wizard compiles**

```bash
npm run dev &
# Wait for compilation, check for errors
```

Expected: No TypeScript errors in wizard

- [ ] **Step 4: Commit**

```bash
git add src/client/components/OfferCreateWizard.tsx
git commit -m "feat(wizard): rewrite offer creation with 3-step process and inline forms"
```

---

## Phase 5: Dashboard & Pages

### Task 8: Rewrite DashboardPage to Show Offers

**Files:**
- Modify: `src/client/pages/DashboardPage.tsx`

- [ ] **Step 1: Rewrite dashboard to query offers and render cards**

Replace entire file with:

```typescript
// src/client/pages/DashboardPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { OfferCard } from '../components/OfferCard';
import { OfferCardExpanded } from '../components/OfferCardExpanded';

export function DashboardPage() {
  const navigate = useNavigate();
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'accepted'>('all');

  // TRPC queries
  const { data: offers, isLoading, refetch } = trpc.finance.offers.list.useQuery();
  const { data: associations } = trpc.finance.associations.list.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: leagues } = trpc.teams.leagues.useQuery();

  // Mutations
  const deleteOffer = trpc.finance.offers.delete.useMutation({
    onSuccess: () => refetch(),
  });

  // Build lookup maps
  const associationMap = useMemo(
    () => Object.fromEntries((associations || []).map((a: any) => [a._id, a])),
    [associations]
  );

  const seasonMap = useMemo(
    () => Object.fromEntries((seasons || []).map((s: any) => [s.id, s])),
    [seasons]
  );

  const leagueMap = useMemo(
    () => Object.fromEntries((leagues || []).map((l: any) => [l.id, l])),
    [leagues]
  );

  // Filter and transform offers
  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    return offers
      .filter((offer: any) => statusFilter === 'all' || offer.status === statusFilter)
      .map((offer: any) => {
        const assoc = associationMap[offer.associationId];
        const season = seasonMap[offer.seasonId];
        const leagueConfigs = (offer.financialConfigs || []).map((config: any) => {
          const league = leagueMap[config.leagueId];
          return {
            leagueId: config.leagueId,
            leagueName: league?.name || `League ${config.leagueId}`,
            costModel: config.costModel,
            baseRateOverride: config.baseRateOverride,
            expectedTeamsCount: config.expectedTeamsCount,
          };
        });

        return {
          id: offer._id,
          associationName: assoc?.name || 'Unknown Association',
          seasonName: season?.name || `Season ${offer.seasonId}`,
          contactName: offer.contact?.name || 'Unknown Contact',
          leagueCount: offer.leagueIds?.length || 0,
          leagueNames: offer.leagueIds
            ?.map((id: number) => leagueMap[id]?.name || `League ${id}`)
            .filter(Boolean) || [],
          status: offer.status,
          createdAt: offer.createdAt,
          sentAt: offer.sentAt,
          acceptedAt: offer.acceptedAt,
          configs: leagueConfigs,
        };
      });
  }, [offers, statusFilter, associationMap, seasonMap, leagueMap]);

  const handleDeleteOffer = (offerId: string) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      deleteOffer.mutate({ id: offerId });
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ margin: 0 }}>Offers</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/offers/new')}
            className="btn btn-primary"
          >
            + New Offer
          </button>
          <button
            onClick={() => navigate('/associations')}
            className="btn btn-secondary"
          >
            Associations
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label style={{ fontWeight: '500', marginRight: '0.5rem' }}>Filter by Status:</label>
        {(['all', 'draft', 'sent', 'accepted'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`btn btn-sm ${
              statusFilter === status ? 'btn-primary' : 'btn-outline'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <p>Loading offers...</p>
      ) : filteredOffers.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: '#999',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3>No offers yet</h3>
          <p>Create your first offer to get started</p>
          <button
            onClick={() => navigate('/offers/new')}
            className="btn btn-primary"
          >
            + Create Your First Offer
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredOffers.map((offer: any) => (
            <OfferCard
              key={offer.id}
              id={offer.id}
              associationName={offer.associationName}
              seasonName={offer.seasonName}
              contactName={offer.contactName}
              leagueCount={offer.leagueCount}
              leagueNames={offer.leagueNames}
              status={offer.status}
              createdAt={offer.createdAt}
              isExpanded={expandedOfferId === offer.id}
              onToggleExpand={() =>
                setExpandedOfferId(expandedOfferId === offer.id ? null : offer.id)
              }
              onDelete={() => handleDeleteOffer(offer.id)}
            >
              {expandedOfferId === offer.id && (
                <OfferCardExpanded
                  seasonName={offer.seasonName}
                  contactName={offer.contactName}
                  leagueNames={offer.leagueNames}
                  configs={offer.configs}
                  onViewDetails={() => navigate(`/offers/${offer.id}`)}
                />
              )}
            </OfferCard>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify dashboard compiles and runs**

```bash
npm run dev &
# Navigate to /dashboard
# Verify: Grid of offer cards appears (or empty state)
```

Expected: No errors, dashboard displays correctly

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/DashboardPage.tsx
git commit -m "feat(dashboard): redesign to show offers as primary entity with expandable configs"
```

---

### Task 9: Verify/Update OffersPage

**Files:**
- Check: `src/client/pages/OffersPage.tsx`

- [ ] **Step 1: Read current OffersPage**

```bash
cat src/client/pages/OffersPage.tsx | head -80
```

- [ ] **Step 2: Verify page uses same offer card components**

If OffersPage exists and differs from DashboardPage, ensure it either:
- Reuses the same OfferCard/OfferCardExpanded components
- Or is an alias to DashboardPage (since primary dashboard IS the offers list)

If different, update to use same components. If simpler, just verify.

- [ ] **Step 3: Commit if changed**

```bash
# Only commit if changes made
git add src/client/pages/OffersPage.tsx
git commit -m "refactor(pages): align OffersPage with dashboard offer card display"
```

---

### Task 10: Verify AssociationsPage

**Files:**
- Check: `src/client/pages/AssociationsPage.tsx`

- [ ] **Step 1: Read current page**

```bash
cat src/client/pages/AssociationsPage.tsx | head -100
```

- [ ] **Step 2: Verify it implements spec requirements:**

- List all associations
- Show: name, email, phone, description
- Count of active offers per association
- CRUD actions: Create, Edit, Delete (with protection for active offers)
- Link to filter offers by association

If missing any of these, update the page.

- [ ] **Step 3: Commit if changed**

```bash
# Only if changes made
git add src/client/pages/AssociationsPage.tsx
git commit -m "feat(associations): ensure page implements full CRUD and active offer protection"
```

---

### Task 11: Verify OfferDetailPage

**Files:**
- Check: `src/client/pages/OfferDetailPage.tsx`

- [ ] **Step 1: Read current page**

```bash
cat src/client/pages/OfferDetailPage.tsx | head -150
```

- [ ] **Step 2: Verify it shows:**

1. Offer metadata (Association, Season, Status, Contact)
2. League configurations table
3. Total revenue calculation
4. Status-dependent actions (Send if draft, Mark Accepted if sent, etc.)
5. Created/Sent/Accepted date tracking

If major sections missing, update to match spec.

- [ ] **Step 3: Commit if changed**

```bash
# Only if changes made
git add src/client/pages/OfferDetailPage.tsx
git commit -m "feat(offer-detail): ensure page shows full offer metadata, configs, and actions"
```

---

## Phase 6: Verification & Polish

### Task 12: Run Full Test Suite

**Files:**
- Test: All new components + existing routers

- [ ] **Step 1: Run tests**

```bash
npm test 2>&1 | tail -30
```

Expected: All tests pass (or expected failures documented)

- [ ] **Step 2: If tests fail, fix**

Identify and fix any test failures (existing model/router tests should still pass)

- [ ] **Step 3: Commit test fixes if any**

```bash
git add src/
git commit -m "fix(tests): correct any test failures from UI changes"
```

---

### Task 13: Manual End-to-End Flow Test

**Files:**
- Manual test (no code changes)

- [ ] **Step 1: Start dev server**

```bash
npm run dev &
```

- [ ] **Step 2: Verify dashboard**

Navigate to `/dashboard`:
- See offers grid (or empty state)
- See filter buttons (All/Draft/Sent/Accepted)
- See "+ New Offer" button

- [ ] **Step 3: Verify wizard flow**

Click "+ New Offer":
- Step 1: Select/create association + season
  - Can select existing association
  - Can create new association inline
  - Can select season
- Step 2: Select/create contact
  - Shows grid of existing contacts
  - Can create new contact inline
- Step 3: Set pricing & leagues
  - Can set cost model
  - Can override base rate
  - Can select multiple leagues
  - Creates offer on submit

- [ ] **Step 4: Verify offer detail**

After creating offer, should land on detail page showing:
- Offer metadata
- League configs table
- Total revenue
- Actions (if draft)

- [ ] **Step 5: Verify expanded card**

Go back to dashboard, expand offer card:
- Shows league config table inline
- Shows total revenue
- Shows action buttons

- [ ] **Step 6: Verify associations page**

Navigate to `/associations`:
- Lists all associations
- Shows create button
- Can edit/delete associations

- [ ] **Step 7: Document any issues**

If any issues found, note them for fixing

---

### Task 14: Final Commit and Summary

**Files:**
- Summary: All implementation complete

- [ ] **Step 1: Check git status**

```bash
git status
```

Expected: No uncommitted changes (all committed)

- [ ] **Step 2: View full commit log**

```bash
git log --oneline | head -15
```

Expected: See all offer-first implementation commits

- [ ] **Step 3: Run full test suite one final time**

```bash
npm test 2>&1 | tail -10
```

Expected: All tests passing

---

## Implementation Complete

**Deliverables:**
- ✅ Dashboard redesigned: Offers as primary cards, expandable league configs
- ✅ 3-step wizard: Association/Season → Contact → Pricing/Leagues with inline creation
- ✅ Offer detail page: Full metadata, configs, revenue, status actions
- ✅ Associations page: Full CRUD with active offer protection
- ✅ All tests passing
- ✅ End-to-end workflow tested

**Key Features:**
- Inline Association and Contact creation during wizard
- Auto-generation of FinancialConfigs on offer creation
- Expandable offer cards showing league breakdown
- Status filters on dashboard
- Responsive grid layout
- Empty state guidance

Ready for review and deployment.
