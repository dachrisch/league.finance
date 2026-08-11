import { Invoice } from '../models/Invoice';

/** Generates the next "YYYYMMDD-NN" invoice number, sequence resetting daily. */
export async function generateInvoiceNumber(date: Date = new Date()): Promise<string> {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Invoice.countDocuments({
    invoiceNumber: { $regex: `^${datePart}-` },
  });
  return `${datePart}-${String(count + 1).padStart(2, '0')}`;
}
