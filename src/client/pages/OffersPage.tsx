import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { OfferSummaryCards } from '../components/OfferSummaryCards';
import { OfferTable } from '../components/OfferTable';
import { Toast } from '../components/Toast';

export function OffersPage() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Fetch offers, associations, and seasons
  const { data: offers = [], isLoading: offersLoading, refetch } = trpc.finance.offers.list.useQuery({});
  const { data: associations = [], isError: assocError, error: assocErrorObj } = trpc.finance.associations.list.useQuery();
  const { data: seasons = [], isError: seasonsError, error: seasonsErrorObj } = trpc.finance.seasons.list.useQuery();

  // Check for errors
  const hasError = assocError || seasonsError;
  const getErrorMessage = (error: any): string => {
    if (!error) return 'Failed to load data';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.data?.message) return error.data.message;
    return 'Failed to load data';
  };
  const errorMessage = getErrorMessage(assocErrorObj) || getErrorMessage(seasonsErrorObj);

  // Mutations
  const deleteOffer = trpc.finance.offers.delete.useMutation({
    onSuccess: () => refetch(),
  });

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

  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

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
    navigate(`/offers/${id}`);
  };

  const handleEditOffer = (id: string) => {
    navigate(`/offers/${id}/edit`);
  };

  const handleDeleteOffer = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      await deleteOffer.mutateAsync({ id });
    }
  };

  if (offersLoading) {
    return <div className="container"><p>Loading offers...</p></div>;
  }

  if (hasError) {
    const displayError = errorMessage || 'Unknown error - database may be unavailable';
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card" style={{
          padding: 'var(--spacing-xl)',
          background: '#fef2f2',
          borderColor: 'var(--danger-color)',
          border: '1px solid',
          borderRadius: 'var(--border-radius-lg)',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <p style={{ margin: 0, color: 'var(--danger-color)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
            ✕ Unable to Load Offers
          </p>
          <p style={{ margin: 'var(--spacing-sm) 0 0 0', color: 'var(--danger-color)', fontSize: 'var(--font-size-sm)', minHeight: '1.5em' }}>
            {displayError}
          </p>
          <p style={{ margin: 'var(--spacing-md) 0 0 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
            Please check your database connection or try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)', fontWeight: 'var(--font-weight-semibold)' }}>Offers</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Manage and track your association pricing offers</p>
        </div>
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

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--spacing-lg) var(--spacing-lg) 0 var(--spacing-lg)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>All Offers</h2>
        </div>
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <OfferTable
            offers={offers}
            associationNames={associationNames}
            seasonYears={seasonYears}
            onView={handleViewOffer}
            onSend={handleSendOffer}
            onEdit={handleEditOffer}
            onDelete={handleDeleteOffer}
            onSendSuccess={() => showToast('Offer sent successfully!')}
            onSendError={(message) => showToast(message, 'error')}
            isLoading={offersLoading || deleteOffer.isPending}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} />
      )}
    </div>
  );
}
