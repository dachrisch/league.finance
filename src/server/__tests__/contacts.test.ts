import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { Contact } from '../models/Contact';
import { connectMongo, disconnectMongo } from '../db/mongo';

describe('Contact Model', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterEach(async () => {
    await Contact.deleteMany({});
  });

  it('should create a contact with name and full address', async () => {
    const contact = await Contact.create({
      name: 'John Smith',
      email: 'john@example.com',
      address: {
        street: '123 Main St',
        city: 'Berlin',
        postalCode: '10115',
        country: 'Germany',
      },
    });

    expect(contact.name).toBe('John Smith');
    expect(contact.address.street).toBe('123 Main St');
    expect(contact.address.city).toBe('Berlin');
    expect(contact.address.postalCode).toBe('10115');
    expect(contact.address.country).toBe('Germany');
    expect(contact.createdAt).toBeDefined();
  });

  it('should require name and all address fields', async () => {
    await expect(
      Contact.create({
        name: 'John Smith',
        address: { street: '123 Main St' },
      })
    ).rejects.toThrow();
  });

  it('should be reusable across multiple offers', async () => {
    const contact = await Contact.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      address: {
        street: '456 Oak Ave',
        city: 'Munich',
        postalCode: '80331',
        country: 'Germany',
      },
    });

    expect(contact._id).toBeDefined();
    // Multiple offers will reference this same ID
  });

  afterAll(async () => {
    await disconnectMongo();
  });
});
