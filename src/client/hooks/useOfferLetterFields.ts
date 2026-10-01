// src/client/hooks/useOfferLetterFields.ts

import { useEffect, useRef, useState } from 'react';

export interface OfferLetterFieldValues {
  offerNumber: string;
  offerDate: string;
  validUntil: string;
  introNote: string;
  closingNote: string;
}

/** The subset of an offer this hook reads to seed/reseed the letter form. */
export interface OfferLetterSource {
  _id: string;
  offerNumber?: string;
  offerDate?: string | Date;
  validUntil?: string | Date;
  introNote?: string;
  closingNote?: string;
}

const EMPTY_FIELDS: OfferLetterFieldValues = {
  offerNumber: '',
  offerDate: '',
  validUntil: '',
  introNote: '',
  closingNote: '',
};

// Europe/Berlin calendar day formatter, 'en-CA' gives YYYY-MM-DD (what <input type="date"> wants).
const berlinDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' });

/**
 * Offer dates print/edit as the Europe/Berlin calendar day everywhere. `toISOString().slice(0,
 * 10)` instead reads the UTC day, which is wrong close to local midnight: a date stored as
 * 2026-09-30T22:30Z is already 2026-10-01 in Berlin (CEST, UTC+2) but `toISOString` shows
 * 2026-09-30, so the date input (and a save right after) would silently go back a day.
 */
const toDateInputValue = (value: string | Date | undefined | null): string =>
  value ? berlinDayFormatter.format(new Date(value)) : '';

const toFields = (src: OfferLetterSource): OfferLetterFieldValues => ({
  offerNumber: src.offerNumber ?? '',
  offerDate: toDateInputValue(src.offerDate),
  validUntil: toDateInputValue(src.validUntil),
  introNote: src.introNote ?? '',
  closingNote: src.closingNote ?? '',
});

export interface OfferLetterUpdatePayload {
  offerNumber?: string;
  offerDate?: string;
  validUntil?: string;
  introNote?: string | null;
  closingNote?: string | null;
}

/**
 * Builds the `updateLetter` payload from the form fields. `offerNumber`/`offerDate`/
 * `validUntil` are omitted (not touched server-side) when empty, same as before. `introNote`/
 * `closingNote` send `null` when cleared rather than being omitted: an omitted key is dropped
 * by JSON before it reaches the server, so the server would see no change at all and keep the
 * old stored note (and print it on the PDF) even though the admin cleared the textarea. `null`
 * tells the server to actually unset the field (see `updateLetter` in offers.ts).
 */
export function toLetterUpdatePayload(fields: OfferLetterFieldValues): OfferLetterUpdatePayload {
  return {
    offerNumber: fields.offerNumber.trim() || undefined,
    offerDate: fields.offerDate || undefined,
    validUntil: fields.validUntil || undefined,
    introNote: fields.introNote || null,
    closingNote: fields.closingNote || null,
  };
}

/**
 * Local, editable copy of an offer's letter fields (Angebotsnummer, Datum, Gültig
 * bis, Zusatztext, Schlusstext).
 *
 * Seeds (or reseeds) the form from `offer` only when the offer's `_id` changes —
 * i.e. on first load, or after navigating to a different offer. A query refetch
 * triggered by an unrelated mutation (e.g. "Preise speichern") still produces a
 * new `offer` object for the *same* id, and must NOT clobber whatever the admin
 * is mid-typing in this form. Call `applySaved` after the letter's own save
 * succeeds to sync the form with the just-saved, server-normalized values.
 */
export function useOfferLetterFields(offer: OfferLetterSource | undefined | null) {
  const [fields, setFields] = useState<OfferLetterFieldValues>(EMPTY_FIELDS);
  const seededOfferId = useRef<string | null>(null);

  useEffect(() => {
    if (!offer) return;
    if (seededOfferId.current === offer._id) return;
    seededOfferId.current = offer._id;
    setFields(toFields(offer));
  }, [offer]);

  const applySaved = (saved: OfferLetterSource) => {
    seededOfferId.current = saved._id;
    setFields(toFields(saved));
  };

  return { fields, setFields, applySaved } as const;
}
