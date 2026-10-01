import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { offersRouter } from '../offers';
import { Offer } from '../../../models/Offer';
import { FinancialConfig } from '../../../models/FinancialConfig';
import { connectMongo, disconnectMongo } from '../../../db/mongo';
import { getMysqlPool } from '../../../db/mysql';
import { offerLinesTotal } from '../../../../../shared/lib/offerLines';

vi.mock('../../../db/mysql');
vi.mocked(getMysqlPool).mockReturnValue({
  query: vi.fn(async (sql: string) => (sql.includes('gamedays_season')
    ? [[{ name: '2027' }]]
    : [[{ id: 16, name: 'Regionalliga NRW' }, { id: 17, name: 'Oberliga NRW' }]])),
} as any);

const caller = offersRouter.createCaller({ user: { userId: '1', email: 't@t', role: 'admin' } } as any);
const draft = (extra: any = {}) => Offer.create({
  associationId: 'a', seasonId: 7, leagueIds: [16, 17], contactId: new Types.ObjectId(), ...extra,
});

describe('offers price lines', () => {
  beforeAll(async () => {
    await connectMongo();
    await Offer.init();
  });
  afterAll(disconnectMongo);
  afterEach(() => Promise.all([Offer.deleteMany({}), FinancialConfig.deleteMany({})]));

  it('setLines stores lines and list/get report the lines total (optional excluded)', async () => {
    const offer = await draft();
    await caller.setLines({ id: offer.id, lines: [
      { label: 'Grundpreis', amount: 600, kind: 'fee' },
      { label: 'Erwachsenenteams', detail: '9 Teams à 18 €', amount: 162, kind: 'fee' },
      { label: 'Extra', amount: 50, kind: 'optional' },
    ] });
    const [listed] = await caller.list();
    expect(listed.totalPrice).toBe(762);
    const got = await caller.get({ id: offer.id });
    expect(got.totalPrice).toBe(762);
    expect(got.offer.lines).toHaveLength(3);
  });

  it('keeps the config-based total for offers without lines', async () => {
    const offer = await draft();
    await FinancialConfig.create({ leagueId: 16, seasonId: 7, costModel: 'SEASON', baseRateOverride: 54,
      expectedTeamsCount: 12, offerId: offer._id });
    const [listed] = await caller.list();
    expect(listed.totalPrice).toBe(648);
  });

  it('F3: get falls back to linesFromConfigs as effectiveLines when the offer has no stored lines, without changing totalPrice', async () => {
    const offer = await draft();
    await FinancialConfig.create({ leagueId: 16, seasonId: 7, costModel: 'SEASON', baseRateOverride: 54,
      expectedTeamsCount: 12, offerId: offer._id });
    const got = await caller.get({ id: offer.id });
    expect(got.offer.lines ?? []).toHaveLength(0);
    expect(got.effectiveLines).toEqual([
      { label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 16 },
    ]);
    expect(got.totalPrice).toBe(648);
    // The table total must equal get.totalPrice (same lines, same rounding).
    expect(offerLinesTotal(got.effectiveLines)).toBe(got.totalPrice);
  });

  it('F3: get returns the stored lines as effectiveLines once an offer has them', async () => {
    const offer = await draft({ lines: [{ label: 'Grundpreis', amount: 600, kind: 'fee' }] });
    const got = await caller.get({ id: offer.id });
    expect(got.effectiveLines).toEqual([{ label: 'Grundpreis', amount: 600, kind: 'fee' }]);
    expect(got.totalPrice).toBe(600);
  });

  it('F7: list derives leaguePrices from lines with a leagueId (summed) once an offer has lines', async () => {
    const offer = await draft({ lines: [
      { label: 'Regionalliga NRW', amount: 400, kind: 'league', leagueId: 16 },
      { label: 'Regionalliga NRW Zusatz', amount: 248, kind: 'league', leagueId: 16 },
      { label: 'Oberliga NRW', amount: 918, kind: 'league', leagueId: 17 },
      { label: 'Grundpreis', amount: 50, kind: 'fee' },
    ] });
    // A stale config must NOT win over the lines-derived breakdown.
    await FinancialConfig.create({ leagueId: 16, seasonId: 7, costModel: 'SEASON', baseRateOverride: 999,
      expectedTeamsCount: 1, offerId: offer._id });
    const [listed] = await caller.list();
    expect(listed.leaguePrices).toEqual([
      { leagueId: 16, finalPrice: 648 },
      { leagueId: 17, finalPrice: 918 },
    ]);
  });

  it('RF1: an offer with lines but no configs and legacy empty leagueIds still lists and gets', async () => {
    const offer = await draft({ lines: [{ label: 'Grundpreis', amount: 600, kind: 'fee' }] });
    await Offer.collection.updateOne({ _id: offer._id }, { $set: { leagueIds: [] } });
    expect((await caller.list())[0].totalPrice).toBe(600);
    expect((await caller.get({ id: offer.id })).totalPrice).toBe(600);
  });

  it('setLines rejects invalid lines with the index', async () => {
    const offer = await draft();
    await expect(caller.setLines({ id: offer.id, lines: [
      { label: 'ok', amount: 1, kind: 'fee' }, { label: 'R', amount: 5, kind: 'discount' },
    ] })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Zeile 2: Rabatt muss negativ sein' });
  });

  it('RF4: setLines/generateLines/updateLetter reject non-draft offers', async () => {
    const offer = await draft({ status: 'sent' });
    await expect(caller.setLines({ id: offer.id, lines: [] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.generateLines({ id: offer.id })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.updateLetter({ id: offer.id, data: { introNote: 'x' } })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('generateLines builds league lines from configs and does not overwrite without the flag', async () => {
    const offer = await draft();
    await FinancialConfig.create({ leagueId: 16, seasonId: 7, costModel: 'SEASON', baseRateOverride: 54,
      expectedTeamsCount: 12, offerId: offer._id });
    const res = await caller.generateLines({ id: offer.id });
    expect(res.lines).toEqual([{ label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 16 }]);
    await caller.setLines({ id: offer.id, lines: [{ label: 'Hand', amount: 1, kind: 'fee' }] });
    await expect(caller.generateLines({ id: offer.id })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await caller.generateLines({ id: offer.id, overwrite: true })).lines[0].label).toBe('Regionalliga NRW');
  });

  it('updateLetter assigns a number, defaults validUntil to offerDate + 30 days', async () => {
    const offer = await draft();
    const res = await caller.updateLetter({ id: offer.id, data: { assignNumber: true, offerDate: new Date('2026-10-01T00:00:00Z') } });
    expect(res.offerNumber).toMatch(/^\d{8}-1$/);
    expect(new Date(res.validUntil).toISOString().slice(0, 10)).toBe('2026-10-31');
  });

  it('F2: clearing introNote/closingNote sends null and unsets them on the server (not kept as before)', async () => {
    const offer = await draft();
    const saved = await caller.updateLetter({ id: offer.id, data: { introNote: 'Zusatz', closingNote: 'Schluss' } });
    expect(saved.introNote).toBe('Zusatz');
    expect(saved.closingNote).toBe('Schluss');

    const cleared = await caller.updateLetter({ id: offer.id, data: { introNote: null, closingNote: null } });
    expect(cleared.introNote).toBeUndefined();
    expect(cleared.closingNote).toBeUndefined();

    const fromDb = await Offer.findById(offer.id);
    expect(fromDb!.introNote).toBeUndefined();
    expect(fromDb!.closingNote).toBeUndefined();
  });

  it('F8: recomputes validUntil from a new offerDate when it changes later without an explicit validUntil', async () => {
    const offer = await draft();
    const first = await caller.updateLetter({ id: offer.id, data: { offerDate: new Date('2026-10-01T00:00:00Z') } });
    expect(new Date(first.validUntil).toISOString().slice(0, 10)).toBe('2026-10-31');

    const second = await caller.updateLetter({ id: offer.id, data: { offerDate: new Date('2026-11-01T00:00:00Z') } });
    expect(new Date(second.validUntil).toISOString().slice(0, 10)).toBe('2026-12-01');
  });

  it('F8: an explicit validUntil sent alongside offerDate is respected, not overridden', async () => {
    const offer = await draft();
    const res = await caller.updateLetter({ id: offer.id, data: {
      offerDate: new Date('2026-10-01T00:00:00Z'), validUntil: new Date('2027-01-01T00:00:00Z'),
    } });
    expect(new Date(res.validUntil).toISOString().slice(0, 10)).toBe('2027-01-01');
  });

  it('RF5: updateLetter maps a duplicate offer number to CONFLICT', async () => {
    await draft({ offerNumber: '20261001-1' });
    const other = await draft();
    await expect(caller.updateLetter({ id: other.id, data: { offerNumber: '20261001-1' } }))
      .rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('previewPdf returns a PDF without changing status', async () => {
    const offer = await draft({ offerNumber: '20261001-9', lines: [{ label: 'Grundpreis', amount: 600, kind: 'fee' }] });
    const res = await caller.previewPdf({ id: offer.id });
    expect(Buffer.from(res.base64, 'base64').toString('ascii', 0, 5)).toBe('%PDF-');
    expect(res.filename).toBe('Angebot_20261001-9-Nutzung der LeagueSphere App für die Saison 2027.pdf');
    expect((await Offer.findById(offer.id))!.status).toBe('draft');
  });

  it('previewPdf rejects an unknown offer with NOT_FOUND', async () => {
    await expect(caller.previewPdf({ id: new Types.ObjectId().toString() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
