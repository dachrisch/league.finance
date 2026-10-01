import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Types } from 'mongoose';
import { connectMongo, disconnectMongo } from '../../db/mongo';
import { Offer } from '../../models/Offer';
import { generateOfferNumber } from '../offerNumbering';

const day = new Date('2026-10-01T10:00:00Z');
const make = (offerNumber?: string) => Offer.create({
  associationId: 'a', seasonId: 7, leagueIds: [1], contactId: new Types.ObjectId(), offerNumber,
});

describe('generateOfferNumber', () => {
  beforeAll(async () => {
    await connectMongo();
    await Offer.init();
  });
  afterAll(disconnectMongo);
  afterEach(() => Offer.deleteMany({}));

  it('starts at -1 for a fresh day', async () => {
    expect(await generateOfferNumber(day)).toBe('20261001-1');
  });

  it('uses the Europe/Berlin calendar day (00:30 CEST on 1 Oct is still 30 Sep in UTC)', async () => {
    expect(await generateOfferNumber(new Date('2026-09-30T22:30:00Z'))).toBe('20261001-1');
  });

  it('continues after the highest numeric suffix of the day, ignoring gaps', async () => {
    await make('20261001-1');
    await make('20261001-4');
    expect(await generateOfferNumber(day)).toBe('20261001-5');
  });

  it('ignores other days and non-numeric legacy suffixes', async () => {
    await make('20260930-9');
    await make('20261001-2_NRW');
    expect(await generateOfferNumber(day)).toBe('20261001-1');
  });

  it('RF5: offerNumber is unique when set, absent numbers may repeat', async () => {
    await make('20261001-1');
    await expect(make('20261001-1')).rejects.toMatchObject({ code: 11000 });
    await make();
    await make();
    expect(await Offer.countDocuments()).toBe(3);
  });
});
