import { Offer } from '../lib/schemas';

interface OfferCardProps {
  offer: Offer;
  associationName: string;
  leagueNames: Record<number, string>;
  contactName: string;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  DRAFT: '#ffc107',
  SENT: '#17a2b8',
  VIEWED: '#17a2b8',
  NEGOTIATING: '#17a2b8',
  ACCEPTED: '#28a745',
  REJECTED: '#dc3545',
};

const statusBgColors: Record<string, string> = {
  DRAFT: '#fff3cd',
  SENT: '#d1ecf1',
  VIEWED: '#d1ecf1',
  NEGOTIATING: '#d1ecf1',
  ACCEPTED: '#d4edda',
  REJECTED: '#f8d7da',
};

export function OfferCard({ offer, associationName, leagueNames, contactName, onView, onDelete }: OfferCardProps) {
  const borderColor = statusColors[offer.status] || '#6c757d';
  const season = `${offer.seasonId}/${offer.seasonId + 1}`;

  return (
    <div
      style={{
        borderLeft: `4px solid ${borderColor}`,
        borderTop: '1px solid #ddd',
        borderRight: '1px solid #ddd',
        borderBottom: '1px solid #ddd',
        background: '#fff',
        borderRadius: '6px',
        padding: '15px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header: Association and Season */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
            {associationName}
          </h3>
          <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>Season {season}</p>
        </div>
        {/* Status Badge */}
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: statusBgColors[offer.status] || '#e2e3e5',
            color: offer.status === 'DRAFT' ? '#856404' : offer.status === 'ACCEPTED' ? '#155724' : offer.status === 'REJECTED' ? '#721c24' : '#0c5460',
          }}
        >
          {offer.status}
        </span>
      </div>

      {/* Contact Name */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#999', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Contact
        </p>
        <p style={{ margin: '0', fontSize: '14px', color: '#333' }}>{contactName}</p>
      </div>

      {/* Leagues */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Leagues
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {offer.selectedLeagueIds.map((leagueId) => (
            <span
              key={leagueId}
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#495057',
              }}
            >
              {leagueNames[leagueId] || `League ${leagueId}`}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
        <button
          onClick={() => onView(offer._id)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          View
        </button>
        {offer.status === 'DRAFT' && (
          <button
            onClick={() => onDelete(offer._id)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
