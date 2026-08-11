import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectMongo, disconnectMongo } from '../../../db/mongo';
import { Offer } from '../../../models/Offer';
import { Association } from '../../../models/Association';
import { Contact } from '../../../models/Contact';
import { FinancialConfig } from '../../../models/FinancialConfig';
import { Invoice } from '../../../models/Invoice';
import { InvoiceLineItem } from '../../../models/InvoiceLineItem';

vi.mock('../../../db/mysql', () => ({
  getMysqlPool: vi.fn(),
}));

import { getMysqlPool } from '../../../db/mysql';
import { invoicesRouter } from '../invoices';

const ctx = { user: { userId: 'u1', email: 'a@bumbleflies.de', role: 'admin' as const } };
const caller = () => invoicesRouter.createCaller(ctx as any);

// One shared pool mock: SEASON leagues resolve to a fixed set of "actual" teams,
// GAMEDAY leagues are unused in these tests. gamedays_league / gamedays_season
// lookups return fixed names.
const mockPool = () => ({
  query: vi.fn((sql: string) => {
    if (/gamedays_league/i.test(sql)) {
      return Promise.resolve([[{ id: 16, name: 'Regionalliga' }, { id: 17, name: 'Oberliga' }]]);
    }
    if (/gamedays_team t\s+JOIN/i.test(sql)) {
      // actual current teams for SEASON model — 4 teams (vs. 3 expected at offer time)
      return Promise.resolve([[{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }]]);
    }
    if (/gamedays_season/i.test(sql)) {
      return Promise.resolve([[{ name: '2026' }]]);
    }
    if (/gamedays_gameday/i.test(sql)) {
      return Promise.resolve([[]]); // no gamedays played yet
    }
    return Promise.resolve([[]]);
  }),
});

describe('invoicesRouter', () => {
  let associationId: string;
  let contactId: string;

  beforeAll(async () => {
    await connectMongo();
  }, 60000);

  beforeEach(async () => {
    vi.mocked(getMysqlPool).mockReturnValue(mockPool() as any);
    const association = await Association.create({
      name: 'AFCV NRW', customerNumber: 10010,
      address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
    });
    associationId = association._id.toString();
    const contact = await Contact.create({
      name: 'Fabian Pawlowski', email: 'fabian@afcvnrw.de',
      address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
    });
    contactId = contact._id.toString();
  });

  afterEach(async () => {
    await Promise.all([
      Offer.deleteMany({}), Association.deleteMany({}), Contact.deleteMany({}),
      FinancialConfig.deleteMany({}), Invoice.deleteMany({}), InvoiceLineItem.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  const makeAcceptedOffer = async () => {
    const offer = await Offer.create({
      associationId, seasonId: 6, leagueIds: [16], contactId, status: 'accepted',
    });
    await FinancialConfig.create({
      leagueId: 16, seasonId: 6, costModel: 'SEASON', baseRateOverride: 50,
      expectedTeamsCount: 3, expectedGamedaysCount: 0, expectedTeamsPerGameday: 0,
      offerId: offer._id,
    });
    return offer;
  };

  describe('previewForOffer', () => {
    it('rejects when the offer is not accepted', async () => {
      const offer = await Offer.create({
        associationId, seasonId: 6, leagueIds: [16], contactId, status: 'draft',
      });
      await expect(caller().previewForOffer({ offerId: offer._id.toString() }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('returns offer vs. live price per league, association/customer info, and season name', async () => {
      const offer = await makeAcceptedOffer();
      const result = await caller().previewForOffer({ offerId: offer._id.toString() });

      expect(result.associationName).toBe('AFCV NRW');
      expect(result.customerNumber).toBe(10010);
      expect(result.seasonName).toBe('2026');
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]).toMatchObject({
        leagueId: 16, leagueName: 'Regionalliga', costModel: 'SEASON',
        offerPrice: 150, // 50 * 3 expected
        livePrice: 200,  // 50 * 4 actual
        liveBasis: 4,
        alreadyInvoiced: false,
      });
    });

    it('flags a league as alreadyInvoiced when a line item already references its config', async () => {
      const offer = await makeAcceptedOffer();
      const config = await FinancialConfig.findOne({ offerId: offer._id });
      const otherInvoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260101-01', invoiceDate: new Date(), servicePeriod: '1.2026', dueDate: new Date(),
      });
      await InvoiceLineItem.create({
        invoiceId: otherInvoice._id, leagueId: 16, financialConfigId: config!._id,
        offerPrice: 150, livePrice: 150, liveBasis: 3, chosenSource: 'offer', customPrice: null, amount: 150,
      });

      const result = await caller().previewForOffer({ offerId: offer._id.toString() });
      expect(result.lines[0].alreadyInvoiced).toBe(true);
    });
  });

  describe('get', () => {
    it('returns the invoice with priced line items and computed totals', async () => {
      const offer = await makeAcceptedOffer();
      const config = await FinancialConfig.findOne({ offerId: offer._id });
      const invoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-01', invoiceDate: new Date('2026-08-10'),
        servicePeriod: '8.2026', dueDate: new Date('2026-09-09'),
      });
      await InvoiceLineItem.create({
        invoiceId: invoice._id, leagueId: 16, financialConfigId: config!._id,
        offerPrice: 150, livePrice: 200, liveBasis: 4, chosenSource: 'live', customPrice: null, amount: 200,
      });

      const result = await caller().get({ id: invoice._id.toString() });

      expect(result.invoice.invoiceNumber).toBe('20260810-01');
      expect(result.association?.name).toBe('AFCV NRW');
      expect(result.contact?.name).toBe('Fabian Pawlowski');
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0]).toMatchObject({ leagueId: 16, leagueName: 'Regionalliga', amount: 200 });
      expect(result.totals.netTotal).toBe(200);
      expect(result.totals.vatTotal).toBe(38);
      expect(result.totals.grossTotal).toBe(238);
    });

    it('throws NOT_FOUND for a missing invoice', async () => {
      await expect(caller().get({ id: new Types.ObjectId().toString() }))
        .rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('list', () => {
    it('returns invoices with computed grossTotal and optional status filter', async () => {
      const offer = await makeAcceptedOffer();
      const config = await FinancialConfig.findOne({ offerId: offer._id });
      const draftInvoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-01', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'draft',
      });
      await InvoiceLineItem.create({
        invoiceId: draftInvoice._id, leagueId: 16, financialConfigId: config!._id,
        offerPrice: 150, livePrice: 150, liveBasis: 3, chosenSource: 'offer', customPrice: null, amount: 150,
      });
      const paidInvoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-02', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'paid',
      });
      await InvoiceLineItem.create({
        invoiceId: paidInvoice._id, leagueId: 16, financialConfigId: config!._id,
        offerPrice: 150, livePrice: 150, liveBasis: 3, chosenSource: 'offer', customPrice: null, amount: 150,
      });

      const all = await caller().list({});
      expect(all).toHaveLength(2);
      expect(all.find((i: any) => i._id === draftInvoice._id.toString())?.grossTotal).toBe(178.5);

      const paidOnly = await caller().list({ status: 'paid' });
      expect(paidOnly).toHaveLength(1);
      expect(paidOnly[0]._id).toBe(paidInvoice._id.toString());
    });
  });
});