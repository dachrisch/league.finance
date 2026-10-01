import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { connectMongo, disconnectMongo } from '../../db/mongo';
import { Offer } from '../../models/Offer';
import { Contact } from '../../models/Contact';
import { Association } from '../../models/Association';
import { FinancialConfig } from '../../models/FinancialConfig';
import { getMysqlPool } from '../../db/mysql';
import { buildOfferPdfData } from '../offerPdfData';

vi.mock('../../db/mysql');
const query = vi.fn(async (sql: string) =>
  sql.includes('gamedays_season') ? [[{ name: '2027' }]] : [[{ id: 16, name: 'Regionalliga NRW' }]]);
vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

describe('buildOfferPdfData', () => {
  beforeAll(connectMongo);
  afterAll(disconnectMongo);
  afterEach(() => Promise.all([Offer, Contact, Association, FinancialConfig].map((m: any) => m.deleteMany({}))));

  const setup = async (offerExtra: any = {}) => {
    const association = await Association.create({ name: 'AFCVNRW e.V.', address: { street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl', country: 'Germany' } } as any);
    const contact = await Contact.create({ name: 'Fabian Pawlowski', email: 'f@x.de', address: { street: 's', city: 'c', postalCode: 'p', country: 'Germany' } });
    return Offer.create({ associationId: association.id, seasonId: 9, leagueIds: [16], contactId: contact._id, ...offerExtra });
  };

  it('uses stored lines, number, dates and the association address with z.H. contact', async () => {
    const offer = await setup({ offerNumber: '20261001-2', offerDate: new Date('2026-10-01'), validUntil: new Date('2026-11-15'),
      lines: [{ label: 'Regionalliga', detail: '12 Teams', amount: 648, kind: 'league' }] });
    const data = await buildOfferPdfData(offer.id);
    expect(data).toMatchObject({
      offerNumber: '20261001-2', seasonName: '2027',
      recipient: { associationName: 'AFCVNRW e.V.', contactName: 'Fabian Pawlowski', street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
      lines: [{ label: 'Regionalliga', amount: 648 }],
    });
  });

  it('falls back to config lines, id prefix number, createdAt date and +30 days for legacy offers', async () => {
    const offer = await setup();
    await FinancialConfig.create({ leagueId: 16, seasonId: 9, costModel: 'SEASON', baseRateOverride: 54, expectedTeamsCount: 12, offerId: offer._id });
    const data = await buildOfferPdfData(offer.id);
    expect(data.offerNumber).toBe(offer.id.slice(0, 8));
    expect(data.lines).toEqual([{ label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 16 }]);
    expect(data.validUntil.getTime() - data.offerDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('throws for an unknown offer', async () => {
    await expect(buildOfferPdfData('507f1f77bcf86cd799439011')).rejects.toThrow('Offer not found');
  });
});
