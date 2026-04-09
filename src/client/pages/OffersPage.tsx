import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { OfferSummaryCards } from '../components/OfferSummaryCards';
import { OfferTable } from '../components/OfferTable';

export function OffersPage() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Fetch offers and associations
  const { data: offers = [], isLoading: offersLoading, refetch: refetchOffers } = trpc.finance.offers.list.useQuery({});
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();
  const { data: summary } = trpc.finance.offers.summary.useQuery();

  // Create association name map
  const associationNames: Record<string, string> = associations.reduce((acc: Record<string, string>, a: any) => {
    acc[a._id] = a.name;
    return acc;
  }, {});

  // Calculate pending count (VIEWED + NEGOTIATING)
  const pendingCount = offers.filter((o: any) => o.status === 'VIEWED' || o.status === 'NEGOTIATING').length;

  const handleCreateOffer = () => {
    navigate('/offers/create');
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

  if (!summary) {
    return <div className="container"><p>Loading offers...</p></div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Pricing Offers</h1>
        <button
          onClick={handleCreateOffer}
          style={{
            padding: '0.5rem 1rem',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          + Create New Offer
        </button>
      </div>

      {/* Summary Cards */}
      <OfferSummaryCards
        totalOffers={summary.totalOffers}
        draftOffers={summary.draftOffers}
        sentOffers={summary.sentOffers}
        pendingOffers={pendingCount}
        acceptedOffers={summary.acceptedOffers}
        totalRevenue={summary.totalOfferValue}
      />

      {/* Offers Table */}
      <OfferTable
        offers={offers}
        associationNames={associationNames}
        onView={handleViewOffer}
        onSend={handleSendOffer}
        onEdit={handleEditOffer}
        isLoading={offersLoading}
      />
    </div>
  );
}
