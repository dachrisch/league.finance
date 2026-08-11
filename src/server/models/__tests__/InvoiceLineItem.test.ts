import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { InvoiceLineItem } from '../InvoiceLineItem';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('InvoiceLineItem Model', () => {
  const invoiceId = new Types.ObjectId();
  const financialConfigId = new Types.ObjectId();

  beforeAll(async () => {
    await connectMongo();
    await InvoiceLineItem.init(); // Ensure unique index is built before tests
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  it('creates a line item with required fields', async () => {
    const doc = await InvoiceLineItem.create({
      invoiceId, leagueId: 16, financialConfigId,
      offerPrice: 648, livePrice: 700, liveBasis: 14,
      chosenSource: 'offer', customPrice: null, amount: 648,
    });

    expect(doc.leagueId).toBe(16);
    expect(doc.chosenSource).toBe('offer');
    expect(doc.amount).toBe(648);
    expect(doc.createdAt).toBeDefined();
  });

  it('rejects an invalid chosenSource', async () => {
    await expect(
      InvoiceLineItem.create({
        invoiceId, leagueId: 17, financialConfigId,
        offerPrice: 100, livePrice: 100, liveBasis: 1,
        chosenSource: 'INVALID' as any, customPrice: null, amount: 100,
      })
    ).rejects.toThrow();
  });

  it('enforces uniqueness of (invoiceId, leagueId)', async () => {
    await InvoiceLineItem.create({
      invoiceId, leagueId: 18, financialConfigId,
      offerPrice: 100, livePrice: 100, liveBasis: 1,
      chosenSource: 'offer', customPrice: null, amount: 100,
    });
    await expect(
      InvoiceLineItem.create({
        invoiceId, leagueId: 18, financialConfigId,
        offerPrice: 200, livePrice: 200, liveBasis: 2,
        chosenSource: 'live', customPrice: null, amount: 200,
      })
    ).rejects.toThrow();
  });

  it('allows a custom amount with chosenSource=custom', async () => {
    const doc = await InvoiceLineItem.create({
      invoiceId, leagueId: 19, financialConfigId,
      offerPrice: 648, livePrice: 700, liveBasis: 14,
      chosenSource: 'custom', customPrice: 600, amount: 600,
    });
    expect(doc.customPrice).toBe(600);
    expect(doc.amount).toBe(600);
  });
});
