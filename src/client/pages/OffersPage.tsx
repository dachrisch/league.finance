import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { OfferSummaryCards } from '../components/OfferSummaryCards';
import { OfferTable } from '../components/OfferTable';

export function OffersPage() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Fetch offers, associations, and seasons
  const { data: offers = [], isLoading: offersLoading, refetch: refetchOffers } = trpc.finance.offers.list.useQuery({});
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();
  const { data: seasons = [] } = trpc.finance.seasons.list.useQuery();

  // Create association name map
  const associationNames: Record<string, string> = associations.reduce((acc: Record<string, string>, a: any) => {
    acc[a._id] = a.name;
    return acc;
  }, {});

  // Create season year map
  const seasonYears: Record<string | number, number> = seasons.reduce((acc: Record<string | number, number>, s: any) => {
    acc[s._id] = s.year;
    return acc;
  }, {});

  // Calculate summary from offers
  const summary = {
    totalOffers: offers.length,
    draftOffers: offers.filter((o: any) => o.status === 'draft').length,
    sentOffers: offers.filter((o: any) => o.status === 'sent').length,
    acceptedOffers: offers.filter((o: any) => o.status === 'accepted').length,
    totalOfferValue: offers.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0),
  };

  const handleCreateOffer = () => {
    navigate('/offers/new');
  };

  const handleViewOffer = (id: string) => {
    navigate(`/offers/${id}`);
  };

  const handleSendOffer = (id: string) => {
    // TODO: Implement send offer modal
    navigate(`/offers/${id}`);
  };

  const handleEditOffer = (id: string) => {
    navigate(`/offers/${id}`);
  };

  if (offersLoading) {
    return <div className="container"><p>Loading offers...</p></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)' }}>Pricing Offers</h1>
        <button
          className="btn btn-primary"
          onClick={handleCreateOffer}
        >
          + Create New Offer
        </button>
      </div>

      {/* Summary Cards */}
      <OfferSummaryCards
        totalOffers={summary.totalOffers}
        draftOffers={summary.draftOffers}
        sentOffers={summary.sentOffers}
        pendingOffers={summary.sentOffers}
        acceptedOffers={summary.acceptedOffers}
        totalRevenue={summary.totalOfferValue}
      />

      {/* Offers Table */}
      <OfferTable
        offers={offers}
        associationNames={associationNames}
        seasonYears={seasonYears}
        onView={handleViewOffer}
        onSend={handleSendOffer}
        onEdit={handleEditOffer}
        isLoading={offersLoading}
      />
    </div>
  );
}
