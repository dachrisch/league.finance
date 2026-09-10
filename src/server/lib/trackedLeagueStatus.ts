export type TrackedLeaguePreOfferStage =
  | 'lead'
  | 'contacted'
  | 'offer_in_progress'
  | 'rejected_pre_offer'
  | 'closed_historical';

export type TrackedLeagueLinkedStage =
  | 'offer_draft'
  | 'offer_awaiting_decision'
  | 'offer_rejected'
  | 'accepted_awaiting_invoice'
  | 'invoiced_unpaid'
  | 'paid';

export type TrackedLeagueEffectiveStatus =
  | { stage: TrackedLeaguePreOfferStage }
  | { stage: TrackedLeagueLinkedStage; offerId: string };

interface TrackedLeagueLike {
  status: string;
  linkedOfferId?: string | null;
}

interface OfferLike {
  _id: unknown;
  status: string;
}

interface InvoiceLike {
  status: string;
}

/**
 * Derives a TrackedLeague's pipeline stage. Once a real Offer is linked, the
 * Offer/Invoice status is the single source of truth — this is NOT persisted
 * on the TrackedLeague document, mirroring computeConfigPrices()'s
 * computed-on-read pattern.
 */
export function computeTrackedLeagueEffectiveStatus(
  trackedLeague: TrackedLeagueLike,
  offer?: OfferLike | null,
  invoice?: InvoiceLike | null
): TrackedLeagueEffectiveStatus {
  if (!trackedLeague.linkedOfferId || !offer) {
    return { stage: trackedLeague.status as TrackedLeaguePreOfferStage };
  }

  const offerId = String(offer._id);

  if (offer.status === 'draft') return { stage: 'offer_draft', offerId };
  if (offer.status === 'sending' || offer.status === 'sent') {
    return { stage: 'offer_awaiting_decision', offerId };
  }
  if (offer.status === 'rejected') return { stage: 'offer_rejected', offerId };

  // offer.status === 'accepted'
  if (!invoice) return { stage: 'accepted_awaiting_invoice', offerId };
  if (invoice.status === 'paid') return { stage: 'paid', offerId };
  return { stage: 'invoiced_unpaid', offerId };
}
