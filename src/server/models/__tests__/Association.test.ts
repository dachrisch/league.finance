import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Association } from '../Association';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('Association Model', () => {
  beforeAll(async () => {
    await connectMongo();
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Association.deleteMany({});
  });

  it('should create an association with name and address', async () => {
    const doc = await Association.create({
      name: 'Northern Region',
      address: {
        street: '100 North St',
        city: 'North City',
        postalCode: '10001',
        country: 'Test Country',
      },
    });

    expect(doc.name).toBe('Northern Region');
    expect(doc.address.street).toBe('100 North St');
    expect(doc.address.city).toBe('North City');
    expect(doc.address.postalCode).toBe('10001');
    expect(doc.address.country).toBe('Test Country');
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    await expect(
      Association.create({
        description: 'Missing name',
        email: 'test@local',
        phone: '555-5555',
        address: {
          street: '123 Test St',
          city: 'Test City',
          postalCode: '10002',
          country: 'Test Country',
        },
      })
    ).rejects.toThrow();
  });

  it('should require all address fields', async () => {
    await expect(
      Association.create({
        name: 'Test',
        address: {
          street: '456 Test Ave',
          city: 'Test City',
          postalCode: '10003',
          // Missing country
        } as any,
      })
    ).rejects.toThrow();
  });

  it('should default customerNumber to null and allow setting it', async () => {
    const doc = await Association.create({
      name: 'AFCV NRW',
      address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
    });
    expect(doc.customerNumber).toBeNull();

    doc.customerNumber = 10010;
    await doc.save();
    const updated = await Association.findById(doc._id);
    expect(updated?.customerNumber).toBe(10010);
  });

  it('should enforce customerNumber uniqueness when set', async () => {
    await Association.create({
      name: 'AFCV NRW',
      address: { street: 'Halterner Straße 193', city: 'Marl', postalCode: '45770', country: 'Germany' },
      customerNumber: 10010,
    });
    await expect(
      Association.create({
        name: 'AFCV Bayern',
        address: { street: 'Georg Brauchle Ring 93', city: 'München', postalCode: '80992', country: 'Germany' },
        customerNumber: 10010,
      })
    ).rejects.toThrow();
  });
});
