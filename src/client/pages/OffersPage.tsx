import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { OfferSummaryCards } from '../components/OfferSummaryCards';
import { OfferTable } from '../components/OfferTable';
import { Toast } from '../components/Toast';

export function OffersPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

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
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete offer', 'error');
    }
  });

  // Create association name map
  const associationNames: Record<string, string> = associations.reduce((acc: Record<string, string>, a: any) => {
    acc[a._id] = a.name;
    return acc;
  }, {});

  // Create season year map
  const seasonYears: Record<string | number, string> = seasons.reduce((acc: Record<string | number, string>, s: any) => {
    acc[s._id] = s.name;
    return acc;
  }, {});

  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' = 'success', action?: { label: string; onClick: () => void }) => {
    setToast({ message, type, action });
  };

  const handleCloseToast = () => {
    setToast(null);
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

  const handleDeleteOffer = (id: string) => {
    // Clear any existing timer
    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    setPendingDeleteId(id);
    
    const timer = setTimeout(() => {
      deleteOffer.mutate({ id });
      setPendingDeleteId(null);
      setUndoTimer(null);
    }, 5000);

    setUndoTimer(timer);

    showToast('Offer deleted', 'success', {
      label: 'Undo',
      onClick: () => {
        clearTimeout(timer);
        setPendingDeleteId(null);
        setUndoTimer(null);
        setToast(null);
      }
    });
  };

  // Filter out pending deletions for optimistic UI
  const visibleOffers = pendingDeleteId 
    ? offers.filter((o: any) => o._id !== pendingDeleteId)
    : offers;

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
            offers={visibleOffers}
            associationNames={associationNames}
            seasonYears={seasonYears}
            onView={handleViewOffer}
            onDelete={handleDeleteOffer}
            isLoading={offersLoading}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          action={toast.action} 
          onClose={handleCloseToast} 
        />
      )}
    </div>
  );
}
