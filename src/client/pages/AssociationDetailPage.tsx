import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { ContactForm } from '../components/ContactForm';
import { ContactGrid } from '../components/ContactGrid';
import { Toast } from '../components/Toast';

type ContactModal = { mode: 'create' } | { mode: 'edit'; id: string } | null;

export function AssociationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contactModal, setContactModal] = useState<ContactModal>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: association, isLoading } = trpc.finance.associations.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );
  const { data: contacts = [], refetch: refetchContacts } = trpc.finance.contacts.list.useQuery(
    { associationId: id },
    { enabled: !!id }
  );

  const createContact = trpc.finance.contacts.create.useMutation({
    onSuccess: () => { setContactModal(null); refetchContacts(); },
  });
  const updateContact = trpc.finance.contacts.update.useMutation({
    onSuccess: () => { setContactModal(null); refetchContacts(); },
  });
  const deleteContact = trpc.finance.contacts.delete.useMutation({
    onSuccess: () => refetchContacts(),
    onError: (error) => setToast({ message: error.message || 'Failed to delete contact', type: 'error' }),
  });

  if (!id) {
    return <div className="container">Association not found.</div>;
  }

  const activeContact = contactModal?.mode === 'edit'
    ? contacts.find((c: any) => c._id === contactModal.id)
    : undefined;

  async function handleContactSubmit(data: any) {
    if (contactModal?.mode === 'edit') {
      await updateContact.mutateAsync({ id: contactModal.id, data });
    } else {
      await createContact.mutateAsync(data);
    }
  }

  if (isLoading) {
    return <div className="container">Loading…</div>;
  }

  if (!association) {
    return <div className="container">Association not found.</div>;
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/associations')} style={{ marginBottom: 'var(--spacing-md)' }}>
        ← Back to Associations
      </button>

      <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)' }}>{association.name}</h1>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 'var(--spacing-xl)' }}>
        {association.address?.street}, {association.address?.postalCode} {association.address?.city}
      </div>

      <section style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Contacts</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setContactModal({ mode: 'create' })}>
            + Add Contact
          </button>
        </div>
        <ContactGrid
          contacts={contacts}
          onEdit={(cid) => setContactModal({ mode: 'edit', id: cid })}
          onDelete={(cid) => deleteContact.mutate({ id: cid })}
        />
      </section>

      {contactModal && (
        <div
          onClick={() => setContactModal(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: '1rem', backdropFilter: 'blur(2px)',
          }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                {contactModal.mode === 'create' ? 'Add Contact' : 'Edit Contact'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setContactModal(null)}>✕</button>
            </div>
            <ContactForm
              initialData={activeContact}
              lockedAssociationId={id}
              onSubmit={handleContactSubmit}
              onCancel={() => setContactModal(null)}
              isLoading={createContact.isPending || updateContact.isPending}
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
