// src/client/hooks/__tests__/useOfferLetterFields.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfferLetterFields, toLetterUpdatePayload, type OfferLetterSource, type OfferLetterFieldValues } from '../useOfferLetterFields';

const offer = (overrides: Partial<OfferLetterSource> = {}): OfferLetterSource => ({
  _id: 'offer-1',
  offerNumber: 'A-2026-001',
  offerDate: '2026-01-15',
  validUntil: '2026-02-14',
  introNote: 'Hallo',
  closingNote: 'Beste Grüße',
  ...overrides,
});

describe('useOfferLetterFields', () => {
  it('starts empty before an offer is loaded', () => {
    const { result } = renderHook(() => useOfferLetterFields(undefined));
    expect(result.current.fields).toEqual({
      offerNumber: '', offerDate: '', validUntil: '', introNote: '', closingNote: '',
    });
  });

  it('seeds fields from the offer once it loads', () => {
    const { result, rerender } = renderHook(({ o }) => useOfferLetterFields(o), {
      initialProps: { o: undefined as OfferLetterSource | undefined },
    });
    rerender({ o: offer() });

    expect(result.current.fields).toEqual({
      offerNumber: 'A-2026-001',
      offerDate: '2026-01-15',
      validUntil: '2026-02-14',
      introNote: 'Hallo',
      closingNote: 'Beste Grüße',
    });
  });

  it('does not reseed when the offer object is replaced but its id is unchanged (unrelated refetch)', () => {
    const { result, rerender } = renderHook(({ o }) => useOfferLetterFields(o), {
      initialProps: { o: offer() },
    });

    act(() => {
      result.current.setFields((f) => ({ ...f, introNote: 'Noch nicht gespeichert' }));
    });
    expect(result.current.fields.introNote).toBe('Noch nicht gespeichert');

    // A new offer object for the SAME id, as a refetch after e.g. "Preise speichern" would produce.
    rerender({ o: offer({ introNote: 'Hallo' }) });

    expect(result.current.fields.introNote).toBe('Noch nicht gespeichert');
  });

  it('reseeds when the offer id changes (navigating to a different offer)', () => {
    const { result, rerender } = renderHook(({ o }) => useOfferLetterFields(o), {
      initialProps: { o: offer({ _id: 'offer-1' }) },
    });

    act(() => {
      result.current.setFields((f) => ({ ...f, introNote: 'Unsaved edit on offer 1' }));
    });

    rerender({ o: offer({ _id: 'offer-2', introNote: 'Offer 2 note' }) });

    expect(result.current.fields.introNote).toBe('Offer 2 note');
  });

  it('applySaved overwrites the fields with the just-saved offer, regardless of pending edits', () => {
    const { result } = renderHook(() => useOfferLetterFields(offer()));

    act(() => {
      result.current.setFields((f) => ({ ...f, offerNumber: 'DRAFT-TYPING' }));
    });

    act(() => {
      result.current.applySaved(offer({ offerNumber: 'A-2026-002' }));
    });

    expect(result.current.fields.offerNumber).toBe('A-2026-002');
  });

  // F9: stored dates must read as the Europe/Berlin calendar day, not the UTC day.
  it('F9: seeds the date fields as the Europe/Berlin calendar day, not the UTC day', () => {
    const { result, rerender } = renderHook(({ o }) => useOfferLetterFields(o), {
      initialProps: { o: undefined as OfferLetterSource | undefined },
    });
    // 2026-09-30T22:30Z is already 2026-10-01 00:30 in Berlin (CEST, UTC+2); toISOString
    // would read the UTC day back as 2026-09-30.
    rerender({ o: offer({ offerDate: '2026-09-30T22:30:00.000Z', validUntil: '2026-09-30T22:30:00.000Z' }) });
    expect(result.current.fields.offerDate).toBe('2026-10-01');
    expect(result.current.fields.validUntil).toBe('2026-10-01');
  });
});

describe('toLetterUpdatePayload', () => {
  const fields = (overrides: Partial<OfferLetterFieldValues> = {}): OfferLetterFieldValues => ({
    offerNumber: 'A-2026-001', offerDate: '2026-01-15', validUntil: '2026-02-14',
    introNote: 'Hallo', closingNote: 'Beste Grüße', ...overrides,
  });

  it('passes through non-empty values unchanged', () => {
    expect(toLetterUpdatePayload(fields())).toEqual({
      offerNumber: 'A-2026-001', offerDate: '2026-01-15', validUntil: '2026-02-14',
      introNote: 'Hallo', closingNote: 'Beste Grüße',
    });
  });

  // F2: an empty textarea must send `null` (unset) rather than being dropped as `undefined`
  // (which would leave the previously-saved note in place and still print it on the PDF).
  it('F2: sends null (not undefined) for a cleared introNote/closingNote', () => {
    const payload = toLetterUpdatePayload(fields({ introNote: '', closingNote: '' }));
    expect(payload.introNote).toBeNull();
    expect(payload.closingNote).toBeNull();
  });

  it('omits offerNumber/offerDate/validUntil when empty, so they are left untouched server-side', () => {
    const payload = toLetterUpdatePayload(fields({ offerNumber: '  ', offerDate: '', validUntil: '' }));
    expect(payload.offerNumber).toBeUndefined();
    expect(payload.offerDate).toBeUndefined();
    expect(payload.validUntil).toBeUndefined();
  });

  it('trims a padded offerNumber', () => {
    expect(toLetterUpdatePayload(fields({ offerNumber: '  A-2026-001  ' })).offerNumber).toBe('A-2026-001');
  });
});
