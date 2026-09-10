import { describe, it, expect } from 'vitest';
import { computeTrackedLeagueEffectiveStatus } from '../trackedLeagueStatus';

describe('computeTrackedLeagueEffectiveStatus', () => {
  it('returns the manual status when not linked to an offer', () => {
    const result = computeTrackedLeagueEffectiveStatus({ status: 'contacted', linkedOfferId: null });
    expect(result).toEqual({ stage: 'contacted' });
  });

  it('falls back to manual status when linkedOfferId is set but the offer was not passed', () => {
    const result = computeTrackedLeagueEffectiveStatus({ status: 'offer_in_progress', linkedOfferId: 'offer-1' });
    expect(result).toEqual({ stage: 'offer_in_progress' });
  });

  it('derives offer_draft from a draft offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'draft' }
    );
    expect(result).toEqual({ stage: 'offer_draft', offerId: 'offer-1' });
  });

  it('derives offer_awaiting_decision from a sending offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'sending' }
    );
    expect(result.stage).toBe('offer_awaiting_decision');
  });

  it('derives offer_awaiting_decision from a sent offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'sent' }
    );
    expect(result.stage).toBe('offer_awaiting_decision');
  });

  it('derives offer_rejected from a rejected offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'rejected' }
    );
    expect(result.stage).toBe('offer_rejected');
  });

  it('derives accepted_awaiting_invoice from an accepted offer with no invoice', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'accepted' },
      null
    );
    expect(result.stage).toBe('accepted_awaiting_invoice');
  });

  it('derives invoiced_unpaid from an accepted offer with an unpaid invoice', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'accepted' },
      { status: 'sent' }
    );
    expect(result.stage).toBe('invoiced_unpaid');
  });

  it('derives paid from an accepted offer with a paid invoice', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'accepted' },
      { status: 'paid' }
    );
    expect(result.stage).toBe('paid');
  });
});
