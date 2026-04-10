import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { associationsRouter } from '../associations';
import { Association } from '../../../models/Association';
import { connectMongo, disconnectMongo } from '../../../db/mongo';

describe('Associations Router', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Association.deleteMany({});
  });

  it('should list associations', async () => {
    await Association.create({
      name: 'League A',
      description: 'Test',
      email: 'a@league.local',
      phone: '555-1111',
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
    });

    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    await caller.delete({ id: created._id.toString() });
    const found = await Association.findById(created._id);
    expect(found).toBeNull();
  });
});
