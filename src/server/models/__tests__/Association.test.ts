import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Association } from '../Association';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('Association Model', () => {
  beforeAll(async () => {
    await connectMongo();
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  it('should create an association with name, description, email, and phone', async () => {
    const doc = await Association.create({
      name: 'Northern Region',
      description: 'Leagues in the northern region',
      email: 'contact@north.local',
      phone: '555-1234',
    });

    expect(doc.name).toBe('Northern Region');
    expect(doc.email).toBe('contact@north.local');
    expect(doc.phone).toBe('555-1234');
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    expect(async () => {
      await Association.create({
        description: 'Missing name',
        email: 'test@local',
        phone: '555-5555',
      });
    }).rejects.toThrow();
  });

  it('should require email field', async () => {
    expect(async () => {
      await Association.create({
        name: 'Test',
        description: 'Missing email',
        phone: '555-5555',
      });
    }).rejects.toThrow();
  });
});
