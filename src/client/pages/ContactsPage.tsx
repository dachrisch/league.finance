import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { ContactGrid } from '../components/ContactGrid';
import { ContactForm } from '../components/ContactForm';

type ModalState = { type: 'create' } | { type: 'edit'; id: string } | { type: 'view'; id: string } | null;

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
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });

  const activeContact = (modal?.type === 'edit' || modal?.type === 'view') && modal?.id
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
          isLoading={isLoading || deleteContact.isPending}
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
                {modal.type === 'create' ? 'Add Person' : 
                 modal.type === 'view' ? 'Person Details' : 'Edit Person'}
              </h2>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                {modal.type === 'view' && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => setModal({ type: 'edit', id: modal.id })}>Edit</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => handleDelete(modal.id)}>Delete</button>
                  </>
                )}
                <button className="btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
              </div>
            </div>
            
            {modal.type === 'view' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Name</label>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>{activeContact?.name}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Address</label>
                  <div>
                    {activeContact?.address ? (
                      <>
                        {activeContact.address.street}<br />
                        {activeContact.address.postalCode} {activeContact.address.city}<br />
                        {activeContact.address.country}
                      </>
                    ) : 'No address provided'}
                  </div>
                </div>
                <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setModal(null)}>Close</button>
                </div>
              </div>
            ) : (
              <ContactForm
                initialData={activeContact}
                onSubmit={handleFormSubmit}
                onCancel={() => setModal(null)}
                isLoading={createContact.isPending || updateContact.isPending}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
