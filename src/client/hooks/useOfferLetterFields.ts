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

const toDateInputValue = (value: string | Date | undefined | null): string =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

const toFields = (src: OfferLetterSource): OfferLetterFieldValues => ({
  offerNumber: src.offerNumber ?? '',
  offerDate: toDateInputValue(src.offerDate),
  validUntil: toDateInputValue(src.validUntil),
  introNote: src.introNote ?? '',
  closingNote: src.closingNote ?? '',
});

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
