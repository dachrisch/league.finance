import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { ContactGrid } from '../components/ContactGrid';
import { ContactForm } from '../components/ContactForm';

type ModalState = { type: 'create' } | { type: 'edit'; id: string } | null;

export function ContactsPage() {
  const [modal, setModal] = useState<ModalState>(null);
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
    onSuccess: () => refetch(),
  });

  const editingContact = modal?.type === 'edit' && modal?.id
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      await deleteContact.mutateAsync({ id });
    }
  };

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
          contacts={contacts}
          onEdit={(id) => setModal({ type: 'edit', id })}
          onDelete={handleDelete}
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
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                {modal.type === 'create' ? 'Add Person' : 'Edit Person'}
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            
            <ContactForm
              initialData={editingContact}
              onSubmit={handleFormSubmit}
              onCancel={() => setModal(null)}
              isLoading={createContact.isPending || updateContact.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
