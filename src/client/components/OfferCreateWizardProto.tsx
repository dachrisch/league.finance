import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

type Step = 1 | 2 | 3 | 4;

interface OfferState {
  association: { id: string; name: string } | null;
  season: { id: number; name: string } | null;
  contact: { id: string; name: string; address: string } | null;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRate: number | null;
  expectedTeams: number;
  selectedLeagues: { id: string; name: string }[];
}

interface League {
  id: number;
  name: string;
  category: 'Youth' | 'Regional' | 'Division' | 'Other';
}

const MOCK_ASSOCIATIONS = [
  { id: '1', name: 'Test Association' },
  { id: '2', name: 'Northern Youth League' },
];

const MOCK_CONTACTS = [
  { id: '1', name: 'John Doe', address: '123 Main St, Berlin 10115, Germany' },
  { id: '2', name: 'Jane Smith', address: '456 Oak Ave, Munich 80331, Germany' },
];

const MOCK_LEAGUES: League[] = [
  { id: 1, name: 'AFVBY_U13', category: 'Youth' },
  { id: 2, name: 'AFVBY_U16', category: 'Youth' },
  { id: 3, name: 'AFVH_U13', category: 'Youth' },
  { id: 4, name: 'RL Bayern', category: 'Regional' },
  { id: 5, name: 'RL NRW', category: 'Regional' },
  { id: 6, name: 'RL Mitte West', category: 'Regional' },
  { id: 7, name: 'RL_Ost', category: 'Regional' },
  { id: 8, name: 'RL Hessen', category: 'Regional' },
  { id: 9, name: 'RL Nord', category: 'Regional' },
  { id: 10, name: 'RL BaWü', category: 'Regional' },
  { id: 11, name: 'DFFL2', category: 'Division' },
  { id: 12, name: 'DFFLBlau26', category: 'Division' },
  { id: 13, name: 'DFFLGelb26', category: 'Division' },
  { id: 14, name: 'DFFLGrün26', category: 'Division' },
  { id: 15, name: 'DFFLRot26', category: 'Division' },
  { id: 16, name: 'DFFLF2', category: 'Division' },
  { id: 17, name: 'SFL', category: 'Other' },
  { id: 18, name: 'FF BL', category: 'Other' },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

  .proto-container {
    font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
    padding: 3rem 1rem;
  }

  .proto-wrapper {
    max-width: 900px;
    margin: 0 auto;
  }

  .proto-header {
    margin-bottom: 3rem;
    animation: slideDown 0.5s ease-out;
  }

  .proto-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
  }

  .proto-subtitle {
    font-size: 1.1rem;
    color: #64748b;
    font-weight: 400;
  }

  .proto-progress {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 3rem;
  }

  .proto-step-btn {
    padding: 1rem;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .proto-step-btn.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
  }

  .proto-step-btn.completed {
    background: #10b981;
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  }

  .proto-step-btn.pending {
    background: #e2e8f0;
    color: #64748b;
  }

  .proto-card {
    background: white;
    border-radius: 1rem;
    padding: 2.5rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
    min-height: 400px;
    animation: slideUp 0.5s ease-out;
  }

  .proto-card-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 2rem 0;
  }

  .proto-field {
    margin-bottom: 2rem;
  }

  .proto-label {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.75rem;
  }

  .proto-input,
  .proto-select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.625rem;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .proto-input:focus,
  .proto-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    background-color: #f0f9ff;
  }

  .proto-button {
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 0.625rem;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
  }

  .proto-button-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .proto-button-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(59, 130, 246, 0.35);
  }

  .proto-button-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .proto-button-secondary {
    background: white;
    color: #64748b;
    border: 2px solid #e2e8f0;
  }

  .proto-button-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .proto-button-success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  .proto-button-success:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(16, 185, 129, 0.35);
  }

  .proto-button-nav {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
  }

  .proto-summary {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px solid #bae6fd;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .proto-summary-title {
    font-weight: 700;
    color: #0c4a6e;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }

  .proto-summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    color: #0c4a6e;
  }

  .proto-summary-item span:first-child {
    font-weight: 500;
  }

  .proto-edit-btn {
    background: none;
    border: none;
    color: #0284c7;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    text-decoration: underline;
  }

  .proto-edit-btn:hover {
    color: #0369a1;
  }

  .proto-radio-group {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .proto-radio-option {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.625rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .proto-radio-option:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .proto-radio-option.selected {
    border-color: #3b82f6;
    background: #f0f9ff;
  }

  .proto-radio-input {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.75rem;
    cursor: pointer;
  }

  .proto-contact-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    margin-bottom: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .proto-contact-card:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .proto-contact-card.selected {
    border-color: #3b82f6;
    background: #f0f9ff;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  .proto-contact-name {
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 0.25rem;
  }

  .proto-contact-address {
    font-size: 0.85rem;
    color: #64748b;
  }

  .proto-league-search {
    position: relative;
    margin-bottom: 1.5rem;
  }

  .proto-league-search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 1.25rem;
  }

  .proto-league-search input {
    padding-left: 2.75rem;
  }

  .proto-filters {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .proto-filter-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 2rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #e2e8f0;
    color: #475569;
  }

  .proto-filter-btn.active {
    background: #3b82f6;
    color: white;
  }

  .proto-counter {
    background: #eff6ff;
    border: 2px solid #bae6fd;
    border-radius: 0.625rem;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }

  .proto-counter-value {
    font-weight: 700;
    color: #0284c7;
  }

  .proto-category {
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .proto-category-header {
    background: #f8fafc;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    border-bottom: 1px solid #e2e8f0;
    transition: background 0.2s ease;
  }

  .proto-category-header:hover {
    background: #f1f5f9;
  }

  .proto-category-title {
    font-weight: 600;
    color: #1e293b;
  }

  .proto-category-chevron {
    display: inline-block;
    transition: transform 0.3s ease;
  }

  .proto-category-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .proto-checkbox-item {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .proto-checkbox-item:hover {
    background: #f0f9ff;
  }

  .proto-checkbox-input {
    width: 1.125rem;
    height: 1.125rem;
    margin-right: 0.75rem;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .proto-checkbox-label {
    flex: 1;
    font-weight: 500;
    color: #1e293b;
    cursor: pointer;
  }

  .proto-checkbox-check {
    color: #3b82f6;
    font-weight: bold;
    margin-left: auto;
  }

  .proto-footer {
    text-align: center;
    margin-top: 2rem;
    color: #64748b;
    font-size: 0.9rem;
  }

  .proto-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
  }

  .proto-modal {
    background: white;
    border-radius: 1rem;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    margin: 1rem;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
    overflow: hidden;
  }

  .proto-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .proto-modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
  }

  .proto-modal-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    color: #94a3b8;
    padding: 0.25rem;
    transition: color 0.2s ease;
  }

  .proto-modal-close:hover {
    color: #475569;
  }

  .proto-modal-content {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }

  .proto-modal-content::-webkit-scrollbar {
    width: 6px;
  }

  .proto-modal-content::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  .proto-modal-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .proto-modal-content::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  .proto-modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .proto-success-message {
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
    max-width: 400px;
    z-index: 10000;
    animation: slideDown 0.3s ease-out;
    white-space: pre-wrap;
    font-size: 0.9rem;
    font-family: monospace;
    line-height: 1.5;
  }
`;

function CreateAssociationModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="proto-modal-overlay">
      <div className="proto-modal">
        <div className="proto-modal-header">
          <h2 className="proto-modal-title">Create New Association</h2>
          <button onClick={onClose} className="proto-modal-close">
            ✕
          </button>
        </div>
        <div className="proto-modal-content">
          <div className="proto-field">
            <label className="proto-label">Association Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Northern Youth League Association"
              className="proto-input"
            />
          </div>
          <div className="proto-field">
            <label className="proto-label">Email *</label>
            <input
              type="email"
              placeholder="contact@association.de"
              className="proto-input"
            />
          </div>
        </div>
        <div className="proto-modal-footer">
          <button onClick={onClose} className="proto-button proto-button-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={() => {
              onSubmit(name);
              setName('');
            }}
            className="proto-button proto-button-primary"
            style={{ flex: 1 }}
          >
            Create Association
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateContactModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contact: any) => void;
}) {
  const [contact, setContact] = useState({ name: '', street: '', city: '', postal: '', country: '' });

  if (!isOpen) return null;

  return (
    <div className="proto-modal-overlay">
      <div className="proto-modal">
        <div className="proto-modal-header">
          <h2 className="proto-modal-title">Create New Contact</h2>
          <button onClick={onClose} className="proto-modal-close">
            ✕
          </button>
        </div>
        <div className="proto-modal-content">
          <div className="proto-field">
            <label className="proto-label">Contact Name *</label>
            <input
              type="text"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              placeholder="e.g., John Doe"
              className="proto-input"
            />
          </div>
          <div className="proto-field">
            <label className="proto-label">Street *</label>
            <input
              type="text"
              value={contact.street}
              onChange={(e) => setContact({ ...contact, street: e.target.value })}
              placeholder="123 Main Street"
              className="proto-input"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="proto-label">City *</label>
              <input
                type="text"
                value={contact.city}
                onChange={(e) => setContact({ ...contact, city: e.target.value })}
                placeholder="Berlin"
                className="proto-input"
              />
            </div>
            <div>
              <label className="proto-label">Postal *</label>
              <input
                type="text"
                value={contact.postal}
                onChange={(e) => setContact({ ...contact, postal: e.target.value })}
                placeholder="10115"
                className="proto-input"
              />
            </div>
            <div>
              <label className="proto-label">Country *</label>
              <input
                type="text"
                value={contact.country}
                onChange={(e) => setContact({ ...contact, country: e.target.value })}
                placeholder="Germany"
                className="proto-input"
              />
            </div>
          </div>
        </div>
        <div className="proto-modal-footer">
          <button onClick={onClose} className="proto-button proto-button-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={() => {
              onSubmit(contact);
              setContact({ name: '', street: '', city: '', postal: '', country: '' });
            }}
            className="proto-button proto-button-primary"
            style={{ flex: 1 }}
          >
            Create Contact
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1AssociationSeason({
  state,
  onAssociationChange,
  onSeasonChange,
  onCreateAssociation,
}: any) {
  const [showCreateAssoc, setShowCreateAssoc] = useState(false);

  return (
    <div>
      <div className="proto-field">
        <label className="proto-label">Association *</label>
        <div style={{ marginBottom: '0.75rem' }}>
          {state.association ? (
            <div style={{ padding: '1rem', background: '#dcfce7', border: '2px solid #86efac', borderRadius: '0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#166534' }}>{state.association.name}</span>
              <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.25rem' }}>✓</span>
            </div>
          ) : (
            <div style={{ padding: '1rem', background: '#f3f4f6', border: '2px dashed #cbd5e1', borderRadius: '0.625rem', textAlign: 'center', color: '#9ca3af' }}>
              No association selected
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreateAssoc(true)}
          className="proto-button proto-button-secondary"
          style={{ width: '100%', marginBottom: '0.5rem' }}
        >
          + Create New Association
        </button>
      </div>

      <div className="proto-field">
        <label className="proto-label">Season *</label>
        <select
          value={state.season?.id || ''}
          onChange={(e) => onSeasonChange({ id: parseInt(e.target.value), name: e.target.value })}
          className="proto-select"
        >
          <option value="">Select a season</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      <CreateAssociationModal
        isOpen={showCreateAssoc}
        onClose={() => setShowCreateAssoc(false)}
        onSubmit={(name) => {
          onCreateAssociation(name);
          setShowCreateAssoc(false);
        }}
      />
    </div>
  );
}

function Step2Contact({ state, onContactChange, onCreateContact }: any) {
  const [showCreateContact, setShowCreateContact] = useState(false);

  return (
    <div>
      <div className="proto-field">
        <label className="proto-label">Select Contact *</label>
        <div style={{ marginBottom: '1rem' }}>
          {MOCK_CONTACTS.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onContactChange(contact)}
              className="proto-contact-card"
              style={{
                borderColor: state.contact?.id === contact.id ? '#3b82f6' : '#e2e8f0',
                background: state.contact?.id === contact.id ? '#f0f9ff' : 'white',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="proto-contact-name">{contact.name}</div>
                  <div className="proto-contact-address">{contact.address}</div>
                </div>
                {state.contact?.id === contact.id && <span style={{ color: '#0284c7', fontSize: '1.25rem' }}>✓</span>}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateContact(true)}
          className="proto-button proto-button-secondary"
          style={{ width: '100%' }}
        >
          + Create New Contact
        </button>
      </div>

      <CreateContactModal
        isOpen={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onSubmit={(contact) => {
          onCreateContact(contact);
          setShowCreateContact(false);
        }}
      />
    </div>
  );
}

function Step3Pricing({ state, onCostModelChange, onBaseRateChange, onTeamsChange, onEdit }: any) {
  return (
    <div>
      <div className="proto-summary">
        <div className="proto-summary-title">📋 Review Your Selections</div>
        <div className="proto-summary-item">
          <span>Association:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600 }}>{state.association?.name}</span>
            <button onClick={() => onEdit(1)} className="proto-edit-btn">Edit</button>
          </div>
        </div>
        <div className="proto-summary-item">
          <span>Season:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600 }}>{state.season?.name}</span>
            <button onClick={() => onEdit(1)} className="proto-edit-btn">Edit</button>
          </div>
        </div>
        <div className="proto-summary-item">
          <span>Contact:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600 }}>{state.contact?.name}</span>
            <button onClick={() => onEdit(2)} className="proto-edit-btn">Edit</button>
          </div>
        </div>
      </div>

      <div className="proto-field">
        <label className="proto-label">Cost Model *</label>
        <div className="proto-radio-group">
          {(['SEASON', 'GAMEDAY'] as const).map((model) => (
            <label
              key={model}
              className={`proto-radio-option ${state.costModel === model ? 'selected' : ''}`}
              style={{ flex: 1 }}
            >
              <input
                type="radio"
                name="costModel"
                value={model}
                checked={state.costModel === model}
                onChange={() => onCostModelChange(model)}
                className="proto-radio-input"
              />
              <span>{model === 'SEASON' ? 'Season Flat Fee' : 'Per Game Day'}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="proto-field">
        <label className="proto-label">Base Rate Override (€)</label>
        <input
          type="number"
          value={state.baseRate || ''}
          onChange={(e) => onBaseRateChange(e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="Leave empty for default (€50)"
          className="proto-input"
        />
      </div>

      <div className="proto-field">
        <label className="proto-label">Expected Teams Count</label>
        <input
          type="number"
          value={state.expectedTeams}
          onChange={(e) => onTeamsChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="proto-input"
        />
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
          ℹ️ Used to estimate total cost for the association
        </div>
      </div>
    </div>
  );
}

function Step4Leagues({ state, onLeagueSelect, onLeagueDeselect }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = ['Youth', 'Regional', 'Division', 'Other'];

  const filtered = useMemo(() => {
    return MOCK_LEAGUES.filter((league) => {
      const matchesSearch = league.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || league.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, League[]> = {};
    filtered.forEach((league) => {
      if (!groups[league.category]) groups[league.category] = [];
      groups[league.category].push(league);
    });
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="proto-league-search">
        <span className="proto-league-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by league name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="proto-input"
        />
      </div>

      <div className="proto-filters">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`proto-filter-btn ${!categoryFilter ? 'active' : ''}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`proto-filter-btn ${categoryFilter === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="proto-counter">
        <span>
          Selected: <span className="proto-counter-value">{state.selectedLeagues.length}</span>
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              filtered.forEach((league) => onLeagueSelect(league.id));
            }}
            className="proto-edit-btn"
          >
            Select All
          </button>
          <button
            onClick={() => {
              state.selectedLeagues.forEach((id: number) => onLeagueDeselect(id));
            }}
            className="proto-edit-btn"
          >
            Clear All
          </button>
        </div>
      </div>

      <div>
        {Object.entries(grouped).map(([category, leagues]) => (
          <div key={category} className="proto-category">
            <button
              onClick={() =>
                setActiveCategory(activeCategory === category ? null : category)
              }
              className="proto-category-header"
              style={{ width: '100%', textAlign: 'left' }}
            >
              <span className="proto-category-title">
                {category} ({leagues.length})
              </span>
              <span
                className="proto-category-chevron"
                style={{
                  transform: activeCategory === category ? 'rotate(90deg)' : '',
                }}
              >
                ›
              </span>
            </button>

            {activeCategory === category && (
              <div className="proto-category-content">
                {leagues.map((league) => (
                  <label key={league.id} className="proto-checkbox-item">
                    <input
                      type="checkbox"
                      checked={state.selectedLeagues.includes(league.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onLeagueSelect(league.id);
                        } else {
                          onLeagueDeselect(league.id);
                        }
                      }}
                      className="proto-checkbox-input"
                    />
                    <span className="proto-checkbox-label">{league.name}</span>
                    {state.selectedLeagues.includes(league.id) && (
                      <span className="proto-checkbox-check">✓</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OfferCreateWizardProto() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [state, setState] = useState<OfferState>({
    association: null,
    season: null,
    contact: null,
    costModel: 'SEASON',
    baseRate: null,
    expectedTeams: 0,
    selectedLeagues: [],
  });

  // TRPC queries & mutations
  const { data: associations } = trpc.finance.associations.list.useQuery();
  const { data: contacts } = trpc.finance.contacts.list.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: leagues } = trpc.teams.leagues.useQuery();

  const createAssociation = trpc.finance.associations.create.useMutation();
  const createContact = trpc.finance.contacts.create.useMutation();
  const createOffer = trpc.finance.offers.create.useMutation();

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep((currentStep + 1) as Step);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  };

  const handleEdit = (step: Step) => {
    setCurrentStep(step);
  };

  const steps = [
    { num: 1, label: 'Association & Season' },
    { num: 2, label: 'Contact' },
    { num: 3, label: 'Pricing' },
    { num: 4, label: 'Leagues' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return state.association && state.season;
      case 2:
        return state.contact;
      case 3:
        return true;
      case 4:
        return state.selectedLeagues.length > 0;
    }
  };

  const stepTitles = [
    'Association & Season',
    'Select Contact',
    'Pricing Configuration',
    'Select Leagues',
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="proto-container">
        <div className="proto-wrapper">
          <div className="proto-header">
            <h1 className="proto-title">Create New Offer</h1>
            <p className="proto-subtitle">Configure pricing and leagues for your association</p>
          </div>

          <div className="proto-progress">
            {steps.map((step) => (
              <button
                key={step.num}
                onClick={() => setCurrentStep(step.num as Step)}
                className={`proto-step-btn ${
                  currentStep === step.num
                    ? 'active'
                    : currentStep > step.num
                      ? 'completed'
                      : 'pending'
                }`}
              >
                {currentStep > step.num && '✓ '}
                Step {step.num}
              </button>
            ))}
          </div>

          <div className="proto-card">
            <h2 className="proto-card-title">{stepTitles[currentStep - 1]}</h2>

            {currentStep === 1 && (
              <Step1AssociationSeason
                state={state}
                onAssociationChange={(assoc: any) =>
                  setState({ ...state, association: assoc })
                }
                onSeasonChange={(season: any) => setState({ ...state, season })}
                onCreateAssociation={(name: string) => {
                  setState({
                    ...state,
                    association: { id: Date.now().toString(), name },
                  });
                }}
              />
            )}

            {currentStep === 2 && (
              <Step2Contact
                state={state}
                onContactChange={(contact: any) => setState({ ...state, contact })}
                onCreateContact={(contact: any) => {
                  setState({
                    ...state,
                    contact: { id: Date.now().toString(), ...contact },
                  });
                }}
              />
            )}

            {currentStep === 3 && (
              <Step3Pricing
                state={state}
                onCostModelChange={(costModel: any) => setState({ ...state, costModel })}
                onBaseRateChange={(baseRate: any) => setState({ ...state, baseRate })}
                onTeamsChange={(expectedTeams: number) =>
                  setState({ ...state, expectedTeams })
                }
                onEdit={handleEdit}
              />
            )}

            {currentStep === 4 && (
              <Step4Leagues
                state={state}
                onLeagueSelect={(leagueId: number) => {
                  if (!state.selectedLeagues.includes(leagueId)) {
                    setState({
                      ...state,
                      selectedLeagues: [...state.selectedLeagues, leagueId],
                    });
                  }
                }}
                onLeagueDeselect={(leagueId: number) => {
                  setState({
                    ...state,
                    selectedLeagues: state.selectedLeagues.filter(
                      (id) => id !== leagueId
                    ),
                  });
                }}
              />
            )}

            <div className="proto-button-nav">
              {currentStep > 1 && (
                <button onClick={handleBack} className="proto-button proto-button-secondary">
                  ‹ Back
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="proto-button proto-button-primary"
                >
                  Next ›
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      // Find the actual database IDs from the selected display objects
                      const selectedAssociation = associations?.find(a => a.name === state.association?.name);
                      const selectedSeason = seasons?.find(s => s.id === state.season?.id || s.name === state.season?.name);
                      const selectedContact = contacts?.find(c => c.name === state.contact?.name);
                      const leagueIds = state.selectedLeagues
                        .map(l => leagues?.find(lg => lg.name === l.name)?.id || l.id)
                        .filter(Boolean);

                      const result = await createOffer.mutateAsync({
                        associationId: selectedAssociation?._id || '',
                        seasonId: selectedSeason?.id || 0,
                        contactId: selectedContact?._id || '',
                        leagueIds: leagueIds as string[],
                        costModel: state.costModel,
                        baseRateOverride: state.baseRate,
                        expectedTeamsCount: state.expectedTeams,
                      });
                      setSuccessMessage('Offer created successfully!');
                      setTimeout(() => {
                        navigate(`/offers/${result._id}`);
                      }, 1500);
                    } catch (err: any) {
                      setSuccessMessage(`Error: ${err?.message || 'Failed to create offer'}`);
                      setTimeout(() => setSuccessMessage(null), 5000);
                    }
                  }}
                  disabled={!canProceed() || createOffer.isPending}
                  className="proto-button proto-button-success"
                >
                  {createOffer.isPending ? 'Creating...' : 'Create Offer (Draft)'}
                </button>
              )}
            </div>
          </div>

          <div className="proto-footer">
            <p>🎨 Interactive prototype of the redesigned offer creation flow</p>
          </div>
        </div>
      </div>
      {successMessage && (
        <div className="proto-success-message">
          {successMessage}
        </div>
      )}
    </>
  );
}
