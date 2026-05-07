import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { AssociationContactForm } from '../components/AssociationContactForm';
import { AssociationForm } from '../components/AssociationForm';
import { AssociationList } from '../components/AssociationList';
import { AssociationInput } from '../lib/schemas';
import { Toast } from '../components/Toast';

interface Modal {
  type: 'create' | 'edit';
  id?: string;
}

export function AssociationsPage() {
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

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
      refetch();
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete association', 'error');
    }
  });

  const activeAssociation = modal?.type === 'edit' && modal?.id
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
    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    setPendingDeleteId(id);
    
    const timer = setTimeout(() => {
      deleteAssociation.mutate({ id });
      setPendingDeleteId(null);
      setUndoTimer(null);
    }, 5000);

    setUndoTimer(timer);

    showToast('Association deleted', 'success', {
      label: 'Undo',
      onClick: () => {
        clearTimeout(timer);
        setPendingDeleteId(null);
        setUndoTimer(null);
        setToast(null);
      }
    });
  }

  function handleCloseModal() {
    setModal(null);
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success', action?: { label: string; onClick: () => void }) => {
    setToast({ message, type, action });
  };

  const visibleAssociations = pendingDeleteId 
    ? associations.filter((a: any) => a._id !== pendingDeleteId)
    : associations;

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
                {modal.type === 'create' ? 'Create Association & Contact' : 'Edit Association'}
              </h2>
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

      {isLoading ? (
        <p>Loading associations...</p>
      ) : (
        <AssociationList
          associations={visibleAssociations}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
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
