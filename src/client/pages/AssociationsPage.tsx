import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { AssociationContactForm } from '../components/AssociationContactForm';
import { AssociationForm } from '../components/AssociationForm';
import { AssociationList } from '../components/AssociationList';
import { AssociationInput } from '../lib/schemas';

interface Modal {
  type: 'create' | 'edit' | 'view';
  id?: string;
}

export function AssociationsPage() {
  const [modal, setModal] = useState<Modal | null>(null);
  const { data: associations = [], isLoading, refetch } = trpc.finance.associations.list.useQuery();
  const createAssociation = trpc.finance.associations.create.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const createContact = trpc.finance.contacts.create.useMutation({
    onSuccess: () => {
      // Potentially refetch contacts if they were displayed here
    },
  });
  const updateAssociation = trpc.finance.associations.update.useMutation({
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });
  const deleteAssociation = trpc.finance.associations.delete.useMutation({
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });

  const activeAssociation = (modal?.type === 'edit' || modal?.type === 'view') && modal?.id
    ? associations.find((a: any) => a._id === modal.id)
    : undefined;

  async function handleFormSubmit(data: AssociationInput) {
    try {
      if (modal?.type === 'edit' && modal?.id) {
        await updateAssociation.mutateAsync({ id: modal.id, data });
      } else {
        await createAssociation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }

  function handleView(id: string) {
    setModal({ type: 'view', id });
  }

  function handleEdit(id: string) {
    setModal({ type: 'edit', id });
  }

  function handleDelete(id: string) {
    if (window.confirm('Are you sure you want to delete this association?')) {
      deleteAssociation.mutate({ id });
    }
  }

  function handleCloseModal() {
    setModal(null);
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)' }}>League Associations</h1>
        <button
          className="btn btn-primary"
          onClick={() => setModal({ type: 'create' })}
          disabled={modal !== null}
        >
          + New Association
        </button>
      </div>

      {/* Modal Background */}
      {modal && (
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          {/* Modal Content */}
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--spacing-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                {modal.type === 'create' ? 'Create Association & Contact' : 
                 modal.type === 'view' ? 'Association Details' : 'Edit Association'}
              </h2>
              {modal.type === 'view' && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleEdit(modal.id!)}>Edit</button>
                  <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => handleDelete(modal.id!)}>Delete</button>
                </div>
              )}
            </div>

            {modal.type === 'create' ? (
              <AssociationContactForm
                onSubmit={async (data) => {
                  let assocId = data.createdEntities.associationId;
                  if (!assocId) {
                    const assoc = await createAssociation.mutateAsync({
                      name: data.association.name,
                      address: data.association.address,
                    });
                    assocId = assoc._id;
                  }

                  let contactId = data.createdEntities.contactId;
                  if (!contactId) {
                    await createContact.mutateAsync({
                      name: data.contact.name,
                      email: data.contact.email,
                      phone: data.contact.phone,
                      address: data.association.address,
                    });
                  }
                  handleCloseModal();
                }}
                isLoading={createAssociation.isPending || createContact.isPending}
                onCancel={handleCloseModal}
              />
            ) : modal.type === 'view' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Name</label>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>{activeAssociation?.name}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Address</label>
                  <div>
                    {activeAssociation?.address ? (
                      <>
                        {activeAssociation.address.street}<br />
                        {activeAssociation.address.postalCode} {activeAssociation.address.city}<br />
                        {activeAssociation.address.country}
                      </>
                    ) : 'No address provided'}
                  </div>
                </div>
                <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleCloseModal}>Close</button>
                </div>
              </div>
            ) : (
              <AssociationForm
                initialData={activeAssociation}
                onSubmit={handleFormSubmit}
                isLoading={updateAssociation.isPending}
                onCancel={handleCloseModal}
              />
            )}
          </div>
        </div>
      )}

      <AssociationList
        associations={associations}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading || deleteAssociation.isPending}
      />
    </div>
  );
}
