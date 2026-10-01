import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { Association } from '../models/Association';
import { FinancialConfig } from '../models/FinancialConfig';
import { computeConfigPrices } from './configPricing';
import { fetchLeaguesMap } from './leagueNames';
import { resolveSeasonName } from './seasonName';
import { getMysqlPool } from '../db/mysql';
import { linesFromConfigs } from '../../../shared/lib/offerLines';
import type { PdfGenerationData } from '../services/PdfService';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything the offer letter needs, resolved from the offer and its relations. Offers created
 * before price lines / letter metadata existed fall back to config-derived lines, the id prefix
 * as number, createdAt as date and a 30-day validity.
 */
export async function buildOfferPdfData(offerId: string): Promise<PdfGenerationData> {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new Error('Offer not found');
  const contact = await Contact.findById(offer.contactId).lean();
  const association = await Association.findById(offer.associationId).lean().catch(() => null);
  // The postal address is the association's; the contact is only the z.H. line.
  const address: { street?: string; postalCode?: string; city?: string } =
    association?.address ?? contact?.address ?? {};

  let lines = offer.lines ?? [];
  if (!lines.length) {
    const configs = await FinancialConfig.find({ offerId: offer._id }).lean();
    const leaguesMap = await fetchLeaguesMap(configs.map((c) => c.leagueId));
    lines = linesFromConfigs(configs.map((c) => computeConfigPrices(c)), leaguesMap);
  }

  const offerDate = offer.offerDate ?? offer.createdAt;
  return {
    offerNumber: offer.offerNumber ?? offer.id.slice(0, 8),
    offerDate,
    validUntil: offer.validUntil ?? new Date(offerDate.getTime() + 30 * DAY_MS),
    introNote: offer.introNote,
    closingNote: offer.closingNote,
    recipient: {
      associationName: association?.name ?? 'Unbekannter Verband',
      contactName: contact?.name,
      street: address.street ?? '',
      postalCode: address.postalCode ?? '',
      city: address.city ?? '',
    },
    lines,
    seasonName: await resolveSeasonName(getMysqlPool(), offer.seasonId),
  };
}
