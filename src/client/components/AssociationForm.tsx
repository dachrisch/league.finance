import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssociationInputSchema, AssociationInput, Association } from '../lib/schemas';

interface AssociationFormProps {
  initialData?: Association;
  onSubmit: (data: AssociationInput) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function AssociationForm({ initialData, onSubmit, isLoading = false, onCancel }: AssociationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssociationInput>({
    resolver: zodResolver(AssociationInputSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description,
      email: initialData.email,
      phone: initialData.phone,
    } : undefined,
  });

  const isProcessing = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="name" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
          Name *
        </label>
        <input
          id="name"
          type="text"
          placeholder="Association name"
          disabled={isProcessing}
          {...register('name')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: errors.name ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />
        {errors.name && <p style={{ margin: '0.25rem 0 0 0', color: '#dc3545', fontSize: 12 }}>{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
          Description *
        </label>
        <textarea
          id="description"
          placeholder="Association description"
          disabled={isProcessing}
          {...register('description')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: errors.description ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: 4,
            boxSizing: 'border-box',
            minHeight: '100px',
            fontFamily: 'inherit',
          }}
        />
        {errors.description && <p style={{ margin: '0.25rem 0 0 0', color: '#dc3545', fontSize: 12 }}>{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="email" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
          Email *
        </label>
        <input
          id="email"
          type="email"
          placeholder="contact@association.com"
          disabled={isProcessing}
          {...register('email')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: errors.email ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />
        {errors.email && <p style={{ margin: '0.25rem 0 0 0', color: '#dc3545', fontSize: 12 }}>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
          Phone *
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="+49 123 456789"
          disabled={isProcessing}
          {...register('phone')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: errors.phone ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />
        {errors.phone && <p style={{ margin: '0.25rem 0 0 0', color: '#dc3545', fontSize: 12 }}>{errors.phone.message}</p>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              background: '#fff',
              borderRadius: 4,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isProcessing}
          style={{
            padding: '0.5rem 1rem',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          {isProcessing ? 'Saving…' : initialData ? 'Update Association' : 'Create Association'}
        </button>
      </div>
    </form>
  );
}
