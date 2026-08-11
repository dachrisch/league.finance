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

vi.mock('../../../services/SheetsService');

import { getMysqlPool } from '../../../db/mysql';
import { SheetsService } from '../../../services/SheetsService';
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

  const makeAcceptedOfferWithTwoLeagues = async () => {
    const offer = await Offer.create({
      associationId, seasonId: 6, leagueIds: [17, 16], contactId, status: 'accepted',
    });
    await FinancialConfig.create({
      leagueId: 16, seasonId: 6, costModel: 'SEASON', baseRateOverride: 50,
      expectedTeamsCount: 3, expectedGamedaysCount: 0, expectedTeamsPerGameday: 0,
      offerId: offer._id,
    });
    await FinancialConfig.create({
      leagueId: 17, seasonId: 6, costModel: 'SEASON', baseRateOverride: 100,
      expectedTeamsCount: 2, expectedGamedaysCount: 0, expectedTeamsPerGameday: 0,
      offerId: offer._id,
    });
    return offer;
  };

  describe('create', () => {
    it('rejects when the offer is not accepted', async () => {
      const offer = await Offer.create({
        associationId, seasonId: 6, leagueIds: [16], contactId, status: 'draft',
      });
      await expect(
        caller().create({ offerId: offer._id.toString(), lines: [{ leagueId: 16, chosenSource: 'offer' }] })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects when the association has no customerNumber', async () => {
      await Association.findByIdAndUpdate(associationId, { customerNumber: null });
      const offer = await makeAcceptedOffer();
      await expect(
        caller().create({ offerId: offer._id.toString(), lines: [{ leagueId: 16, chosenSource: 'offer' }] })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects a leagueId that is not part of the offer', async () => {
      const offer = await makeAcceptedOffer();
      await expect(
        caller().create({ offerId: offer._id.toString(), lines: [{ leagueId: 999, chosenSource: 'offer' }] })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects chosenSource=custom without a customPrice', async () => {
      const offer = await makeAcceptedOffer();
      await expect(
        caller().create({ offerId: offer._id.toString(), lines: [{ leagueId: 16, chosenSource: 'custom' }] })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('creates line items in offer.leagueIds order with resolved offer/live/custom amounts', async () => {
      const offer = await makeAcceptedOfferWithTwoLeagues();

      const result = await caller().create({
        offerId: offer._id.toString(),
        lines: [
          { leagueId: 16, chosenSource: 'live' },       // offer.leagueIds = [17, 16]
          { leagueId: 17, chosenSource: 'custom', customPrice: 555 },
        ],
      });

      expect(result.invoice.invoiceNumber).toMatch(/^\d{8}-\d{2}$/);
      expect(result.invoice.customerNumber).toBe(10010);
      expect(result.invoice.seasonId).toBe(6);
      expect(result.invoice.status).toBe('draft');
      expect(result.invoice.servicePeriod).toMatch(/^\d{1,2}\.\d{4}$/);
      const dueDiffDays = (new Date(result.invoice.dueDate).getTime() - new Date(result.invoice.invoiceDate).getTime()) / 86400000;
      expect(Math.round(dueDiffDays)).toBe(30);

      // League 17 comes first because it's first in offer.leagueIds, regardless of input order.
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0]).toMatchObject({ leagueId: 17, chosenSource: 'custom', amount: 555 });
      expect(result.lineItems[1]).toMatchObject({ leagueId: 16, chosenSource: 'live', amount: 200 });

      const persisted = await InvoiceLineItem.find({ invoiceId: result.invoice._id }).sort({ createdAt: 1, _id: 1 });
      expect(persisted.map((li) => li.leagueId)).toEqual([17, 16]);
    });

    it('persists an invoice-level discount', async () => {
      const offer = await makeAcceptedOffer();
      const result = await caller().create({
        offerId: offer._id.toString(),
        lines: [{ leagueId: 16, chosenSource: 'offer' }],
        discount: { type: 'FIXED', value: 20, description: 'Einstiegsrabatt' },
      });
      expect(result.invoice.discount).toMatchObject({ type: 'FIXED', value: 20, description: 'Einstiegsrabatt' });
    });

    describe('create — Sheets sync', () => {
      const mockAppendInvoiceRows = vi.fn();
      const ctxWithToken = { ...ctx, accessToken: 'ya29.x' };
      const callerWithToken = () => invoicesRouter.createCaller(ctxWithToken as any);

      beforeEach(() => {
        mockAppendInvoiceRows.mockReset().mockResolvedValue(undefined);
        (SheetsService as any).mockImplementation(function () {
          return { appendInvoiceRows: mockAppendInvoiceRows };
        });
      });

      it('appends invoice + line item rows to the Sheets ledger when an access token is present', async () => {
        const offer = await makeAcceptedOffer();
        await callerWithToken().create({
          offerId: offer._id.toString(), lines: [{ leagueId: 16, chosenSource: 'offer' }],
        });

        expect(mockAppendInvoiceRows).toHaveBeenCalledTimes(1);
        const [header, lines] = mockAppendInvoiceRows.mock.calls[0];
        expect(header).toMatchObject({ clientId: 10010, state: 'draft', paymentTerm: 30 });
        expect(lines).toEqual([
          expect.objectContaining({ position: 1, description: 'LeagueSphere App Saison 2026 - Regionalliga', net: 150 }),
        ]);
      });

      it('does not attempt a sync when there is no access token', async () => {
        const offer = await makeAcceptedOffer();
        await caller().create({ offerId: offer._id.toString(), lines: [{ leagueId: 16, chosenSource: 'offer' }] });
        expect(mockAppendInvoiceRows).not.toHaveBeenCalled();
      });

      it('does not fail invoice creation when the Sheets sync call rejects', async () => {
        mockAppendInvoiceRows.mockRejectedValueOnce(new Error('Sheets API down'));
        const offer = await makeAcceptedOffer();
        const result = await callerWithToken().create({
          offerId: offer._id.toString(), lines: [{ leagueId: 16, chosenSource: 'offer' }],
        });
        expect(result.invoice.invoiceNumber).toMatch(/^\d{8}-\d{2}$/);
      });
    });
  });

  describe('markPaid', () => {
    it('rejects a draft invoice', async () => {
      const offer = await makeAcceptedOffer();
      const invoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-05', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'draft',
      });
      await expect(caller().markPaid({ id: invoice._id.toString() }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('transitions a sent invoice to paid and sets paidAt', async () => {
      const offer = await makeAcceptedOffer();
      const invoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-06', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'sent',
      });
      const result = await caller().markPaid({ id: invoice._id.toString() });
      expect(result.status).toBe('paid');
      expect(result.paidAt).toBeDefined();
    });

    describe('markPaid — Sheets sync', () => {
      const mockUpdateInvoiceState = vi.fn();
      const ctxWithToken = { ...ctx, accessToken: 'ya29.x' };
      const callerWithToken = () => invoicesRouter.createCaller(ctxWithToken as any);

      beforeEach(() => {
        mockUpdateInvoiceState.mockReset().mockResolvedValue(undefined);
        (SheetsService as any).mockImplementation(function () {
          return { updateInvoiceState: mockUpdateInvoiceState };
        });
      });

      it('updates the Sheets ledger state to paid when an access token is present', async () => {
        const offer = await makeAcceptedOffer();
        const invoice = await Invoice.create({
          offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
          invoiceNumber: '20260810-09', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
          status: 'sent',
        });
        await callerWithToken().markPaid({ id: invoice._id.toString() });
        expect(mockUpdateInvoiceState).toHaveBeenCalledWith('20260810-09', 'paid');
      });

      it('does not fail markPaid when the Sheets sync call rejects, and records sheetSync.lastError', async () => {
        mockUpdateInvoiceState.mockRejectedValueOnce(new Error('Sheets API down'));
        const offer = await makeAcceptedOffer();
        const invoice = await Invoice.create({
          offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
          invoiceNumber: '20260810-10', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
          status: 'sent',
        });
        const result = await callerWithToken().markPaid({ id: invoice._id.toString() });
        expect(result.status).toBe('paid');
        const persisted = await Invoice.findById(invoice._id);
        expect(persisted?.sheetSync?.lastError).toBe('Sheets API down');
      });

      it('does not attempt a sync when there is no access token', async () => {
        const offer = await makeAcceptedOffer();
        const invoice = await Invoice.create({
          offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
          invoiceNumber: '20260810-11', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
          status: 'sent',
        });
        await caller().markPaid({ id: invoice._id.toString() });
        expect(mockUpdateInvoiceState).not.toHaveBeenCalled();
      });
    });
  });

  describe('delete', () => {
    it('rejects deleting a non-draft invoice', async () => {
      const offer = await makeAcceptedOffer();
      const invoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-07', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'sent',
      });
      await expect(caller().delete({ id: invoice._id.toString() }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('deletes a draft invoice and its line items', async () => {
      const offer = await makeAcceptedOffer();
      const config = await FinancialConfig.findOne({ offerId: offer._id });
      const invoice = await Invoice.create({
        offerId: offer._id, associationId, contactId, customerNumber: 10010, seasonId: 6,
        invoiceNumber: '20260810-08', invoiceDate: new Date(), servicePeriod: '8.2026', dueDate: new Date(),
        status: 'draft',
      });
      await InvoiceLineItem.create({
        invoiceId: invoice._id, leagueId: 16, financialConfigId: config!._id,
        offerPrice: 150, livePrice: 150, liveBasis: 3, chosenSource: 'offer', customPrice: null, amount: 150,
      });

      await caller().delete({ id: invoice._id.toString() });

      expect(await Invoice.findById(invoice._id)).toBeNull();
      expect(await InvoiceLineItem.find({ invoiceId: invoice._id })).toHaveLength(0);
    });
  });
});