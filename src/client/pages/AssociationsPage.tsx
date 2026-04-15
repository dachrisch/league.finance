import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { AssociationContactForm } from '../components/AssociationContactForm';
import { AssociationForm } from '../components/AssociationForm';
import { AssociationList } from '../components/AssociationList';
import { AssociationInput } from '../lib/schemas';

interface Modal {
  type: 'create' | 'edit';
  id?: string;
}

export function AssociationsPage() {
  const [modal, setModal] = useState<Modal | null>(null);
  const { data: associations = [], isLoading, refetch } = trpc.finance.associations.list.useQuery();
  const createAssociation = trpc.finance.associations.create.useMutation({
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });
  const updateAssociation = trpc.finance.associations.update.useMutation({
    onSuccess: () => {
      setModal(null);
      refetch();
    },
  });
  const deleteAssociation = trpc.finance.associations.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const editingAssociation = modal?.type === 'edit' && modal?.id
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

  function handleEdit(id: string) {
    setModal({ type: 'edit', id });
  }

  function handleDelete(id: string) {
    deleteAssociation.mutate({ id });
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
            <h2 style={{ margin: '0 0 var(--spacing-lg) 0', fontSize: 'var(--font-size-xl)' }}>
              {modal.type === 'create' ? 'Create Association & Contact' : 'Edit Association'}
            </h2>
            {modal.type === 'create' ? (
              <AssociationContactForm
                onSubmit={async (data) => {
                  await createAssociation.mutateAsync({
                    name: data.association.name,
                    address: data.association.address,
                  });
                  handleCloseModal();
                }}
                isLoading={createAssociation.isPending}
                onCancel={handleCloseModal}
              />
            ) : (
              <AssociationForm
                initialData={editingAssociation}
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
