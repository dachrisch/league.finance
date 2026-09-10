import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { contactsRouter } from '../contacts';
import { Contact } from '../../../models/Contact';
import { Association } from '../../../models/Association';
import { connectMongo, disconnectMongo } from '../../../db/mongo';

describe('contactsRouter', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Promise.all([Contact.deleteMany({}), Association.deleteMany({})]);
  });

  it('creates a contact linked to an association', async () => {
    const association = await Association.create({
      name: 'AFVH',
      address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
    });

    const caller = contactsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const created = await caller.create({
      name: 'Michael Hanke',
      email: 'michael@afvh.de',
      address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
      associationId: association._id.toString(),
    });

    expect(created.associationId).toBe(association._id.toString());
  });

  it('filters list by associationId', async () => {
    const assocA = await Association.create({ name: 'A', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    const assocB = await Association.create({ name: 'B', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    await Contact.create({ name: 'Person A', email: 'a@a.de', associationId: assocA._id.toString(), address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    await Contact.create({ name: 'Person B', email: 'b@b.de', associationId: assocB._id.toString(), address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });

    const caller = contactsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.list({ associationId: assocA._id.toString() });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Person A');
  });

  it('list with no input returns all contacts (backward compatible)', async () => {
    await Contact.create({ name: 'Person A', email: 'a@a.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    await Contact.create({ name: 'Person B', email: 'b@b.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });

    const caller = contactsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.list();

    expect(result).toHaveLength(2);
  });
});
