import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const getToastStyles = (type: 'success' | 'error' | 'info'): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: 'var(--spacing-lg)',
    borderRadius: 'var(--border-radius-md)',
    minWidth: '280px',
    maxWidth: '450px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.3s ease-out',
    justifyContent: 'space-between',
  };

  const typeStyles: Record<'success' | 'error' | 'info', React.CSSProperties> = {
    success: {
      backgroundColor: 'var(--primary-color)',
      color: 'white',
      border: `1px solid var(--primary-color)`,
    },
    error: {
      backgroundColor: '#fef2f2',
      color: 'var(--danger-color)',
      border: `1px solid var(--danger-color)`,
    },
    info: {
      backgroundColor: 'var(--primary-color)',
      color: 'white',
      border: `1px solid var(--primary-color)`,
    },
  };

  return {
    ...baseStyles,
    ...typeStyles[type],
  };
};

const getIconEmoji = (type: 'success' | 'error' | 'info'): string => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'info':
      return 'i';
    default:
      return '';
  }
};

export function Toast({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  action,
}: ToastProps) {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={getToastStyles(type)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              minWidth: '20px',
              textAlign: 'center',
            }}
          >
            {getIconEmoji(type)}
          </span>
          <span style={{ fontSize: 'var(--font-size-md)', fontWeight: '500' }}>
            {message}
          </span>
        </div>
        
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              onClose?.();
            }}
            className="btn btn-sm"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              marginLeft: 'var(--spacing-md)',
              minHeight: '28px',
              padding: '0 var(--spacing-md)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </>
  );
}
