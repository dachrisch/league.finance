export interface ExistingInvoiceValue {
  invoiceNumber: string;
  /** yyyy-mm-dd, as produced by <input type="date"> */
  invoiceDate: string;
  /** M.YYYY, e.g. "1.2026" */
  servicePeriod: string;
  status: 'sent' | 'paid';
  driveLink: string;
}

export const emptyExistingInvoice: ExistingInvoiceValue = {
  invoiceNumber: '',
  invoiceDate: '',
  servicePeriod: '',
  status: 'sent',
  driveLink: '',
};

/** Mirrors RecordExistingInvoiceSchema so the submit button only enables for input the server accepts. */
export const isExistingInvoiceValid = (v: ExistingInvoiceValue): boolean =>
  /^\d{8}-\d{2}$/.test(v.invoiceNumber) &&
  v.invoiceDate !== '' &&
  /^\d{1,2}\.\d{4}$/.test(v.servicePeriod) &&
  (v.driveLink === '' || /^https?:\/\//.test(v.driveLink));

interface ExistingInvoiceFieldsProps {
  value: ExistingInvoiceValue;
  onChange: (value: ExistingInvoiceValue) => void;
}

const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4 };

/** Inputs for recording an invoice that was already issued outside the app. */
export function ExistingInvoiceFields({ value, onChange }: ExistingInvoiceFieldsProps) {
  const set = <K extends keyof ExistingInvoiceValue>(key: K, v: ExistingInvoiceValue[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
      <label style={fieldStyle}>
        Invoice number
        <input
          type="text"
          placeholder="YYYYMMDD-NN"
          value={value.invoiceNumber}
          onChange={(e) => set('invoiceNumber', e.target.value.trim())}
          style={{ width: 140 }}
        />
      </label>
      <label style={fieldStyle}>
        Invoice date
        <input type="date" value={value.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} />
      </label>
      <label style={fieldStyle}>
        Service period
        <input
          type="text"
          placeholder="M.YYYY"
          value={value.servicePeriod}
          onChange={(e) => set('servicePeriod', e.target.value.trim())}
          style={{ width: 90 }}
        />
      </label>
      <label style={fieldStyle}>
        Status
        <select value={value.status} onChange={(e) => set('status', e.target.value as ExistingInvoiceValue['status'])}>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
      </label>
      <label style={{ ...fieldStyle, flex: 1, minWidth: 220 }}>
        Drive link to the issued PDF
        <input
          type="url"
          placeholder="https://drive.google.com/file/d/…"
          value={value.driveLink}
          onChange={(e) => set('driveLink', e.target.value.trim())}
        />
      </label>
    </div>
  );
}
