import { trpc } from '../lib/trpc';

interface Discount {
  _id: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  description: string;
}

interface Props {
  discounts: Discount[];
  isAdmin: boolean;
  onRemoved: () => void;
}

export function DiscountList({ discounts, isAdmin, onRemoved }: Props) {
  const removeDiscount = trpc.finance.discounts.remove.useMutation({ onSuccess: onRemoved });

  if (discounts.length === 0) return <p style={{ color: '#aaa', fontStyle: 'italic' }}>No discounts applied.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {discounts.map((d) => (
        <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: '#f8f9fa', borderRadius: 6, border: '1px solid #eee' }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>
              {d.type === 'FIXED' ? `${d.value.toFixed(2)} €` : `${d.value}%`}
            </span>
            {d.description && <span style={{ marginLeft: '10px', color: '#666' }}>— {d.description}</span>}
          </div>
          {isAdmin && (
            <button
              onClick={() => removeDiscount.mutate({ id: d._id })}
              disabled={removeDiscount.isPending}
              style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {removeDiscount.isPending ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
