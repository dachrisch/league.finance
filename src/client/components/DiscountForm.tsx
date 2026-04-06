import { useState } from 'react';
import { trpc } from '../lib/trpc';

interface Props {
  configId: string;
  onAdded: () => void;
}

export function DiscountForm({ configId, onAdded }: Props) {
  const [type, setType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const addDiscount = trpc.finance.discounts.add.useMutation({ onSuccess: onAdded });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addDiscount.mutate({ configId, type, value: Number(value), description });
    setValue('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 12, color: '#666' }}>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value as 'FIXED' | 'PERCENT')} style={{ padding: '6px 10px' }}>
          <option value="FIXED">Fixed (€)</option>
          <option value="PERCENT">Percentage (%)</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 12, color: '#666' }}>Value</span>
        <input type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value)} required style={{ padding: '6px 10px', width: 100 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <span style={{ fontSize: 12, color: '#666' }}>Description</span>
        <input type="text" placeholder="e.g. Early bird" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '6px 10px' }} />
      </div>
      <button type="submit" disabled={addDiscount.isPending} style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
        {addDiscount.isPending ? 'Adding…' : 'Add Discount'}
      </button>
    </form>
  );
}
