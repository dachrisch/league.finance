import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfferSummaryCards } from '../OfferSummaryCards';

describe('OfferSummaryCards', () => {
  beforeEach(() => {
    // Setup before each test
  })
  it('renders all summary cards', () => {
    render(
      <OfferSummaryCards
        totalOffers={10}
        draftOffers={3}
        sentOffers={5}
        pendingOffers={2}
        acceptedOffers={4}
        totalRevenue={5000}
      />
    );

    expect(screen.getByText('Total Offers')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Pending Response')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
  });

  it('displays correct counts', () => {
    render(
      <OfferSummaryCards
        totalOffers={10}
        draftOffers={3}
        sentOffers={5}
        pendingOffers={2}
        acceptedOffers={4}
        totalRevenue={5000}
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('formats total revenue correctly', () => {
    render(
      <OfferSummaryCards
        totalOffers={10}
        draftOffers={3}
        sentOffers={5}
        pendingOffers={2}
        acceptedOffers={4}
        totalRevenue={5000.50}
      />
    );

    expect(screen.getByText('$5000.50')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(
      <OfferSummaryCards
        totalOffers={0}
        draftOffers={0}
        sentOffers={0}
        pendingOffers={0}
        acceptedOffers={0}
        totalRevenue={0}
      />
    );

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });

  it('displays revenue with proper formatting', () => {
    render(
      <OfferSummaryCards
        totalOffers={1}
        draftOffers={0}
        sentOffers={0}
        pendingOffers={0}
        acceptedOffers={0}
        totalRevenue={1234.56}
      />
    );

    expect(screen.getByText('$1234.56')).toBeInTheDocument();
  });
});
