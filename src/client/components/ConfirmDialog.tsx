import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '400px',
          width: '90%',
          padding: 'var(--spacing-xl)',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--border-radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-lg)' }}>
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 var(--spacing-lg) 0',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-md)',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            justifyContent: 'flex-end',
            marginTop: 'var(--spacing-lg)',
          }}
        >
          <button className="btn btn-outline btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--danger-color)',
              color: '#fff',
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
