import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { ContactGrid } from '../components/ContactGrid';
import { ContactForm } from '../components/ContactForm';
import { Toast } from '../components/Toast';

type ModalState = { type: 'create' } | { type: 'edit'; id: string } | null;

export function ContactsPage() {
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  const { data: contacts = [], isLoading, refetch } = trpc.finance.contacts.list.useQuery();

  const createContact = trpc.finance.contacts.create.useMutation({
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });

  const updateContact = trpc.finance.contacts.update.useMutation({
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });

  const deleteContact = trpc.finance.contacts.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete contact', 'error');
    }
  });

  const activeContact = modal?.type === 'edit' && modal?.id
    ? contacts.find((c: any) => c._id === modal.id)
    : undefined;

  async function handleFormSubmit(data: any) {
    try {
      if (modal?.type === 'edit' && modal?.id) {
        await updateContact.mutateAsync({ id: modal.id, data });
      } else {
        await createContact.mutateAsync(data);
      }
    } catch (err) {
      console.error('Failed to save contact:', err);
    }
  }

  const handleDelete = (id: string) => {
    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    setPendingDeleteId(id);
    
    const timer = setTimeout(() => {
      deleteContact.mutate({ id });
      setPendingDeleteId(null);
      setUndoTimer(null);
    }, 5000);

    setUndoTimer(timer);

    showToast('Person deleted', 'success', {
      label: 'Undo',
      onClick: () => {
        clearTimeout(timer);
        setPendingDeleteId(null);
        setUndoTimer(null);
        setToast(null);
      }
    });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success', action?: { label: string; onClick: () => void }) => {
    setToast({ message, type, action });
  };

  const visibleContacts = pendingDeleteId 
    ? contacts.filter((c: any) => c._id !== pendingDeleteId)
    : contacts;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)', fontWeight: 'var(--font-weight-semibold)' }}>People</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Manage association contact persons</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModal({ type: 'create' })}
        >
          + Add Person
        </button>
      </div>

      {isLoading ? (
        <p>Loading contacts...</p>
      ) : (
        <ContactGrid
          contacts={visibleContacts}
          onEdit={(id) => setModal({ type: 'edit', id })}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}

      {modal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                {modal.type === 'create' ? 'Add Person' : 'Edit Person'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            
            <ContactForm
              initialData={activeContact}
              onSubmit={handleFormSubmit}
              onCancel={() => setModal(null)}
              isLoading={createContact.isPending || updateContact.isPending}
            />
          </div>
        </div>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          action={toast.action} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
