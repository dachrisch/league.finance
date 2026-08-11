import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { Invoice } from '../../models/Invoice';
import { connectMongo, disconnectMongo } from '../../db/mongo';
import { generateInvoiceNumber } from '../invoiceNumbering';

const makeInvoice = (invoiceNumber: string) => ({
  offerId: new Types.ObjectId(),
  associationId: 'a1',
  contactId: new Types.ObjectId(),
  customerNumber: 10010,
  seasonId: 2026,
  invoiceNumber,
  invoiceDate: new Date(),
  servicePeriod: '8.2026',
  dueDate: new Date(),
});

describe('generateInvoiceNumber', () => {
  beforeAll(async () => {
    await connectMongo();
  }, 60000);

  afterEach(async () => {
    await Invoice.deleteMany({});
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  it('starts at -01 for a day with no invoices yet', async () => {
    const number = await generateInvoiceNumber(new Date('2026-08-10T12:00:00Z'));
    expect(number).toBe('20260810-01');
  });

  it('increments the sequence for the same day', async () => {
    await Invoice.create(makeInvoice('20260810-01'));
    await Invoice.create(makeInvoice('20260810-02'));
    const number = await generateInvoiceNumber(new Date('2026-08-10T12:00:00Z'));
    expect(number).toBe('20260810-03');
  });

  it('resets to -01 on a different day', async () => {
    await Invoice.create(makeInvoice('20260809-01'));
    await Invoice.create(makeInvoice('20260809-02'));
    const number = await generateInvoiceNumber(new Date('2026-08-10T12:00:00Z'));
    expect(number).toBe('20260810-01');
  });

  it('zero-pads the sequence to 2 digits', async () => {
    for (let i = 1; i <= 9; i++) {
      await Invoice.create(makeInvoice(`20260810-0${i}`));
    }
    const number = await generateInvoiceNumber(new Date('2026-08-10T12:00:00Z'));
    expect(number).toBe('20260810-10');
  });
});
