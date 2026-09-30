import { Invoice } from '../models/Invoice';

/**
 * Generates the next "YYYYMMDD-NN" invoice number, sequence resetting daily.
 * Continues after the highest existing suffix (not the count) so a day that already
 * holds recorded, externally issued numbers with gaps never yields a colliding number.
 */
export async function generateInvoiceNumber(date: Date = new Date()): Promise<string> {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const sameDay = await Invoice.find({ invoiceNumber: { $regex: `^${datePart}-` } }, { invoiceNumber: 1 }).lean();
  const highest = sameDay.reduce((max, { invoiceNumber }) => {
    const suffix = Number(invoiceNumber.slice(datePart.length + 1));
    return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
  }, 0);
  return `${datePart}-${String(highest + 1).padStart(2, '0')}`;
}
