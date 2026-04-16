import React, { useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';

interface SendOfferDialogProps {
  offerId: string;
  initialEmail: string;
  associationName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendOfferDialog({ offerId, initialEmail, associationName, onClose, onSuccess }: SendOfferDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [folderId, setFolderId] = useState<string>('');
  const [folderName, setFolderName] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const sendOffer = trpc.finance.offers.sendOffer.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId as string);
      setIsSending(true);
    },
    onError: (err) => {
      alert(`Failed to start sending: ${err.message}`);
    }
  });

  const { data: statusData } = trpc.finance.offers.getOfferSendStatus.useQuery(
    { offerId },
    { 
      enabled: isSending,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === 'completed' || data?.status === 'failed') return false;
        return 1000;
      }
    }
  );

  useEffect(() => {
    if (statusData?.status === 'completed') {
      setIsSending(false);
      onSuccess();
    }
  }, [statusData?.status, onSuccess]);

  const handleSend = () => {
    if (!folderId) {
      alert('Please select a Google Drive folder first');
      return;
    }
    sendOffer.mutate({
      offerId,
      driveFolderId: folderId,
      recipientEmail: email,
    });
  };

  // Simplified Drive Picker simulation for now
  // In a real app, this would use gapi.picker
  const openPicker = () => {
    // For demo/initial implementation, we'll just ask for a folder ID or use a default
    const id = prompt('Enter Google Drive Folder ID (or leave empty for root):', 'root');
    if (id !== null) {
      setFolderId(id);
      setFolderName(id === 'root' ? 'My Drive' : 'Selected Folder');
    }
  };

  const progress = statusData?.progress || 0;
  const status = statusData?.status || 'pending';
  const error = (statusData as any)?.error;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content card" style={{
        width: '100%',
        maxWidth: '500px',
        background: 'var(--bg-primary)',
        padding: 'var(--spacing-xl)',
        position: 'relative'
      }}>
        <h2 style={{ marginTop: 0 }}>Send Offer</h2>
        <p style={{ color: 'var(--text-muted)' }}>{associationName}</p>

        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'bold' }}>Recipient Email</label>
          <input 
            type="email" 
            className="form-control" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSending}
          />
        </div>

        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'bold' }}>Google Drive Destination</label>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <input 
              type="text" 
              className="form-control" 
              value={folderName} 
              readOnly 
              placeholder="No folder selected"
            />
            <button className="btn btn-outline" onClick={openPicker} disabled={isSending}>
              Select Folder
            </button>
          </div>
        </div>

        {isSending && (
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', textTransform: 'capitalize' }}>
                {status.replace('-', ' ')}...
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>{progress}%</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${progress}%`, 
                height: '100%', 
                background: 'var(--primary-color)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div style={{ 
            padding: 'var(--spacing-md)', 
            background: '#fee2e2', 
            color: '#b91c1c', 
            borderRadius: 'var(--border-radius-md)',
            marginBottom: 'var(--spacing-lg)',
            fontSize: 'var(--font-size-sm)'
          }}>
            <strong>Error:</strong> {error || 'Something went wrong'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSend} 
            disabled={isSending || !folderId || !email}
          >
            {isSending ? 'Sending...' : status === 'failed' ? 'Retry' : 'Send Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
