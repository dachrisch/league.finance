import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ExistingInvoiceFields,
  emptyExistingInvoice,
  isExistingInvoiceValid,
  type ExistingInvoiceValue,
} from '../ExistingInvoiceFields';

const valid: ExistingInvoiceValue = {
  invoiceNumber: '20260809-01',
  invoiceDate: '2026-10-01',
  servicePeriod: '1.2026',
  status: 'sent',
  driveLink: 'https://drive.google.com/file/d/abc/view',
};

describe('isExistingInvoiceValid', () => {
  it('accepts a complete value', () => {
    expect(isExistingInvoiceValid(valid)).toBe(true);
  });

  it('accepts a missing Drive link', () => {
    expect(isExistingInvoiceValid({ ...valid, driveLink: '' })).toBe(true);
  });

  it('rejects a malformed invoice number, service period or missing date', () => {
    expect(isExistingInvoiceValid({ ...valid, invoiceNumber: '2026-01' })).toBe(false);
    expect(isExistingInvoiceValid({ ...valid, servicePeriod: '2026' })).toBe(false);
    expect(isExistingInvoiceValid({ ...valid, invoiceDate: '' })).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(isExistingInvoiceValid(emptyExistingInvoice)).toBe(false);
  });
});

describe('ExistingInvoiceFields', () => {
  it('renders the current values', () => {
    render(<ExistingInvoiceFields value={valid} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Invoice number')).toHaveValue('20260809-01');
    expect(screen.getByLabelText('Invoice date')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('Service period')).toHaveValue('1.2026');
    expect(screen.getByLabelText('Status')).toHaveValue('sent');
    expect(screen.getByLabelText('Drive link to the issued PDF')).toHaveValue(valid.driveLink);
  });

  it('reports edits as a merged value', () => {
    const onChange = vi.fn();
    render(<ExistingInvoiceFields value={valid} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Invoice number'), { target: { value: '20260809-02' } });
    expect(onChange).toHaveBeenCalledWith({ ...valid, invoiceNumber: '20260809-02' });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'paid' } });
    expect(onChange).toHaveBeenCalledWith({ ...valid, status: 'paid' });
  });
});
