import { Offer } from '../models/Offer';

/**
 * Next "YYYYMMDD-N" offer number (the legacy Google Docs scheme, unpadded), continuing after
 * the highest purely numeric suffix of that day. Hand-typed legacy numbers like "…-2_NRW"
 * are ignored rather than parsed.
 */
export async function generateOfferNumber(date: Date = new Date()): Promise<string> {
  // The Europe/Berlin calendar day ('en-CA' formats as YYYY-MM-DD), not the UTC one.
  const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(date).replace(/-/g, '');
  const sameDay = await Offer.find({ offerNumber: { $regex: `^${datePart}-\\d+$` } }, { offerNumber: 1 }).lean();
  const highest = sameDay.reduce((max, { offerNumber }) => Math.max(max, Number(offerNumber!.slice(datePart.length + 1))), 0);
  return `${datePart}-${highest + 1}`;
}
