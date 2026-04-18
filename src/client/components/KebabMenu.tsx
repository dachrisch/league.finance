import React, { useState, useRef, useEffect } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface KebabMenuProps {
  items: MenuItem[];
  disabled?: boolean;
}

export const KebabMenu: React.FC<KebabMenuProps> = ({ items, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [open]);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setOpen(false);
    }
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <button
        className="btn btn-ghost btn-sm"
        style={{
          minWidth: '32px',
          minHeight: '32px',
          padding: '4px 8px',
        }}
        onClick={() => setOpen(!open)}
        disabled={disabled}
        aria-label="Actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        ⋮
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '4px',
            zIndex: 100,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '140px',
            overflow: 'hidden',
          }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              style={{
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-size-sm)',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.danger ? 'var(--danger-color)' : 'inherit',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onClick={() => handleItemClick(item)}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'var(--bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
