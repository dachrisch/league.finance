import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Invoice } from '../Invoice';
import { Offer } from '../Offer';
import { Contact } from '../Contact';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('Invoice Model', () => {
  let offerId: string;
  let contactId: string;

  beforeAll(async () => {
    await connectMongo();
    await Invoice.init(); // Ensure unique index is built before tests
    const contact = await Contact.create({
      name: 'Fabian Pawlowski',
      email: 'fabian@afcvnrw.de',
      address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
    });
    contactId = contact._id.toString();
    const offer = await Offer.create({
      associationId: 'assoc-1', seasonId: 2026, leagueIds: [1, 2], contactId, status: 'accepted',
    });
    offerId = offer._id.toString();
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  it('creates an invoice with required fields and defaults', async () => {
    const doc = await Invoice.create({
      offerId, associationId: 'assoc-1', contactId, customerNumber: 10010, seasonId: 2026,
      invoiceNumber: '20260810-01', invoiceDate: new Date('2026-08-10'),
      servicePeriod: '8.2026', dueDate: new Date('2026-09-09'),
    });

    expect(doc.status).toBe('draft');
    expect(doc.invoiceNumber).toBe('20260810-01');
    expect(doc.customerNumber).toBe(10010);
    expect(doc.createdAt).toBeDefined();
  });

  it('enforces invoiceNumber uniqueness', async () => {
    await Invoice.create({
      offerId, associationId: 'assoc-1', contactId, customerNumber: 10010, seasonId: 2026,
      invoiceNumber: '20260810-99', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
    });
    await expect(
      Invoice.create({
        offerId, associationId: 'assoc-1', contactId, customerNumber: 10011, seasonId: 2026,
        invoiceNumber: '20260810-99', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
      })
    ).rejects.toThrow();
  });

  it('rejects an invalid status', async () => {
    await expect(
      Invoice.create({
        offerId, associationId: 'assoc-1', contactId, customerNumber: 10010, seasonId: 2026,
        invoiceNumber: '20260810-02', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'INVALID' as any,
      })
    ).rejects.toThrow();
  });

  it('accepts an optional discount subdocument', async () => {
    const doc = await Invoice.create({
      offerId, associationId: 'assoc-1', contactId, customerNumber: 10010, seasonId: 2026,
      invoiceNumber: '20260810-03', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
      discount: { type: 'PERCENT', value: 10, description: 'Einstiegsrabatt' },
    });
    expect(doc.discount?.type).toBe('PERCENT');
    expect(doc.discount?.value).toBe(10);
  });

  it('accepts driveMetadata and sheetSync subdocuments', async () => {
    const doc = new Invoice({
      offerId, associationId: 'assoc-1', contactId, customerNumber: 10010, seasonId: 2026,
      invoiceNumber: '20260810-04', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
      driveMetadata: { driveFileId: 'f1', driveFolderId: 'fold1', driveLink: 'http://x', filedAt: new Date() },
      sheetSync: { lastError: 'boom' },
    });
    expect(doc.driveMetadata?.driveFileId).toBe('f1');
    expect(doc.sheetSync?.lastError).toBe('boom');
  });
});
