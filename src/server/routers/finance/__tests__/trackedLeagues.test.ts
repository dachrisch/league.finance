import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { trackedLeaguesRouter } from '../trackedLeagues';
import { TrackedLeague } from '../../../models/TrackedLeague';
import { Association } from '../../../models/Association';
import { Contact } from '../../../models/Contact';
import { Offer } from '../../../models/Offer';
import { Invoice } from '../../../models/Invoice';
import { connectMongo, disconnectMongo } from '../../../db/mongo';
import { getMysqlPool } from '../../../db/mysql';

vi.mock('../../../db/mysql');

const caller = () => trackedLeaguesRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

describe('trackedLeaguesRouter', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Promise.all([
      TrackedLeague.deleteMany({}),
      Association.deleteMany({}),
      Contact.deleteMany({}),
      Offer.deleteMany({}),
      Invoice.deleteMany({}),
    ]);
    vi.clearAllMocks();
  });

  describe('create/list/update/delete', () => {
    it('creates a tracked league with defaults', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });

      const created = await caller().create({
        associationId: association._id.toString(),
        name: 'Regionalliga Hessen',
        year: 2026,
        isYouth: false,
      });

      expect(created.status).toBe('lead');
      expect(created.leaguesphereLeagueId).toBeNull();
    });

    it('lists tracked leagues for an association with a lead effectiveStatus', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false, status: 'contacted' });

      const result = await caller().list({ associationId: association._id.toString() });

      expect(result).toHaveLength(1);
      expect(result[0].effectiveStatus).toEqual({ stage: 'contacted' });
    });

    it('lists a tracked league linked to an accepted, paid offer as paid', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const contact = await Contact.create({ name: 'Michael Hanke', email: 'michael@afvh.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const offer = await Offer.create({ associationId: association._id.toString(), seasonId: 2026, leagueIds: [16], contactId: contact._id, status: 'accepted' });
      await Invoice.create({
        offerId: offer._id, associationId: association._id.toString(), contactId: contact._id, customerNumber: 1,
        seasonId: 2026, invoiceNumber: 'INV-1', invoiceDate: new Date(), servicePeriod: '2026', dueDate: new Date(),
        status: 'paid',
      });
      await TrackedLeague.create({
        associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false,
        linkedOfferId: offer._id,
      });

      const result = await caller().list({ associationId: association._id.toString() });

      expect(result[0].effectiveStatus).toEqual({ stage: 'paid', offerId: offer._id.toString() });
    });

    it('updates leaguesphereLeagueId', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const created = await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false });

      const updated = await caller().update({ id: created._id.toString(), data: { leaguesphereLeagueId: 16 } });

      expect(updated.leaguesphereLeagueId).toBe(16);
    });

    it('deletes a tracked league', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const created = await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false });

      await caller().delete({ id: created._id.toString() });

      expect(await TrackedLeague.findById(created._id)).toBeNull();
    });
  });

  describe('crosscheck', () => {
    it('returns candidates for unlinked leagues matched by season and association', async () => {
      const association = await Association.create({
        name: 'AFVH', leaguesphereAssociationId: 3,
        address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
      });
      const unlinked = await TrackedLeague.create({
        associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false,
      });

      const query = vi.fn()
        .mockResolvedValueOnce([[{ id: 6 }]])
        .mockResolvedValueOnce([[{ _id: 16, name: 'Regionalliga Hessen' }]]);
      vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

      const result = await caller().crosscheck({ associationId: association._id.toString(), years: [2026] });

      expect(result[unlinked._id.toString()]).toEqual([
        { leaguesphereLeagueId: 16, name: 'Regionalliga Hessen', confidence: 'exact' },
      ]);
    });

    it('returns no candidates when the season does not exist yet', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      await TrackedLeague.create({ associationId: association._id.toString(), name: 'U16 Hessen', year: 2027, isYouth: true });

      const query = vi.fn().mockResolvedValueOnce([[]]);
      vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

      const result = await caller().crosscheck({ associationId: association._id.toString(), years: [2027] });

      expect(result).toEqual({});
    });

    it('skips already-linked leagues', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false, leaguesphereLeagueId: 16 });

      const query = vi.fn();
      vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

      const result = await caller().crosscheck({ associationId: association._id.toString(), years: [2026] });

      expect(result).toEqual({});
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('linkToOffer', () => {
    it('sets linkedOfferId on all given tracked leagues', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const a = await TrackedLeague.create({ associationId: association._id.toString(), name: 'League A', year: 2026, isYouth: false });
      const b = await TrackedLeague.create({ associationId: association._id.toString(), name: 'League B', year: 2026, isYouth: false });
      const contact = await Contact.create({ name: 'C', email: 'c@c.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const offer = await Offer.create({ associationId: association._id.toString(), seasonId: 2026, leagueIds: [1, 2], contactId: contact._id });

      await caller().linkToOffer({ ids: [a._id.toString(), b._id.toString()], offerId: offer._id.toString() });

      const refreshedA = await TrackedLeague.findById(a._id);
      const refreshedB = await TrackedLeague.findById(b._id);
      expect(refreshedA?.linkedOfferId?.toString()).toBe(offer._id.toString());
      expect(refreshedB?.linkedOfferId?.toString()).toBe(offer._id.toString());
    });
  });
});
