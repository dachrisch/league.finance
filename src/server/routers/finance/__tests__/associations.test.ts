import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { associationsRouter } from '../associations';
import { Association } from '../../../models/Association';
import { Offer } from '../../../models/Offer';
import { Contact } from '../../../models/Contact';
import { SheetsService } from '../../../services/SheetsService';
import { connectMongo, disconnectMongo } from '../../../db/mongo';

vi.mock('../../../services/SheetsService');

const mockUpsertClientRow = vi.fn();

describe('Associations Router', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (SheetsService as any).mockImplementation(function () {
      return { upsertClientRow: mockUpsertClientRow };
    });
    mockUpsertClientRow.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await Promise.all([Association.deleteMany({}), Offer.deleteMany({}), Contact.deleteMany({})]);
  });

  it('should list associations', async () => {
    await Association.create({
      name: 'League A',
      description: 'Test',
      email: 'a@league.local',
      phone: '555-1111',
      address: {
        street: '100 League St',
        city: 'League City',
        postalCode: '11111',
        country: 'Test Country',
      },
    });

    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should get association by id', async () => {
    const created = await Association.create({
      name: 'League B',
      description: 'Test',
      email: 'b@league.local',
      phone: '555-2222',
      address: {
        street: '200 League St',
        city: 'League City',
        postalCode: '22222',
        country: 'Test Country',
      },
    });

    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.getById({ id: created._id.toString() });
    expect(result?.name).toBe('League B');
  });

  it('should create an association', async () => {
    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.create({
      name: 'Test League',
      description: 'Test',
      email: 'test@league.local',
      phone: '555-1234',
      address: {
        street: '300 League St',
        city: 'League City',
        postalCode: '33333',
        country: 'Test Country',
      },
    });

    expect(result._id).toBeDefined();
    expect(result.name).toBe('Test League');
  });

  it('should update association', async () => {
    const created = await Association.create({
      name: 'League C',
      description: 'Test',
      email: 'c@league.local',
      phone: '555-3333',
      address: {
        street: '400 League St',
        city: 'League City',
        postalCode: '44444',
        country: 'Test Country',
      },
    });

    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.update({
      id: created._id.toString(),
      data: { name: 'Updated League C' },
    });

    expect(result?.name).toBe('Updated League C');
  });

  it('should delete association', async () => {
    const created = await Association.create({
      name: 'League D',
      description: 'Test',
      email: 'd@league.local',
      phone: '555-4444',
      address: {
        street: '500 League St',
        city: 'League City',
        postalCode: '55555',
        country: 'Test Country',
      },
    });

    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    await caller.delete({ id: created._id.toString() });
    const found = await Association.findById(created._id);
    expect(found).toBeNull();
  });

  it('creates and updates an association with a linked leaguesphere association', async () => {
    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

    const created = await caller.create({
      name: 'AFCV NRW e.V.',
      description: 'Test',
      email: 'nrw@league.local',
      phone: '555-9999',
      address: {
        street: '1 League St',
        city: 'League City',
        postalCode: '99999',
        country: 'Test Country',
      },
      leaguesphereAssociationId: 3,
    });
    expect(created.leaguesphereAssociationId).toBe(3);

    const updated = await caller.update({
      id: created._id,
      data: { leaguesphereAssociationId: null },
    });
    expect(updated?.leaguesphereAssociationId).toBeNull();
  });

  it('creates an association with a customerNumber and returns it from list/get', async () => {
    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const created = await caller.create({
      name: 'AFCV NRW',
      address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
      customerNumber: 10010,
    });
    expect(created.customerNumber).toBe(10010);

    const fetched = await caller.get({ id: created._id });
    expect(fetched.customerNumber).toBe(10010);
  });

  it('updates customerNumber via update', async () => {
    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const created = await caller.create({
      name: 'AFCV Bayern',
      address: { street: 'Georg Brauchle Ring 93', city: 'München', postalCode: '80992', country: 'Germany' },
    });
    expect(created.customerNumber).toBeNull();

    const updated = await caller.update({ id: created._id, data: { customerNumber: 10007 } });
    expect(updated.customerNumber).toBe(10007);
  });

  describe('update — Sheets sync on customerNumber change', () => {
    it('upserts a client row when customerNumber is included in the update', async () => {
      const created = await Association.create({
        name: 'AFCV NRW',
        address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
      });
      const contact = await Contact.create({
        name: 'Fabian Pawlowski', email: 'fabian@afcvnrw.de',
        address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
      });
      await Offer.create({
        associationId: created._id.toString(), seasonId: 2026, leagueIds: [16], contactId: contact._id, status: 'accepted',
      });

      const caller = associationsRouter.createCaller({
        user: { userId: '1', email: 'test@test.com', role: 'admin' }, accessToken: 'ya29.x',
      } as any);
      await caller.update({ id: created._id.toString(), data: { customerNumber: 10010 } });

      expect(mockUpsertClientRow).toHaveBeenCalledWith({
        clientId: 10010,
        clientName: 'AFCV NRW',
        standardInvoiceAddress: 'AFCV NRW\nz.H. Fabian Pawlowski\nHalterner Straße 193\n45770 Marl',
      });
    });

    it('does not sync when the update does not touch customerNumber', async () => {
      const created = await Association.create({
        name: 'AFCV NRW',
        address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
        customerNumber: 10010,
      });
      const caller = associationsRouter.createCaller({
        user: { userId: '1', email: 'test@test.com', role: 'admin' }, accessToken: 'ya29.x',
      } as any);
      await caller.update({ id: created._id.toString(), data: { name: 'AFCV NRW (renamed)' } });
      expect(mockUpsertClientRow).not.toHaveBeenCalled();
    });

    it('does not throw when the Sheets sync call fails', async () => {
      const created = await Association.create({
        name: 'AFCV NRW', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
      });
      mockUpsertClientRow.mockRejectedValueOnce(new Error('Sheets API down'));
      const caller = associationsRouter.createCaller({
        user: { userId: '1', email: 'test@test.com', role: 'admin' }, accessToken: 'ya29.x',
      } as any);
      const result = await caller.update({ id: created._id.toString(), data: { customerNumber: 10011 } });
      expect(result.customerNumber).toBe(10011);
    });
  });
});
