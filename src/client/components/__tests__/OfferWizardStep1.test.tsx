import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfferWizardStep1 } from '../OfferWizardStep1';

// Mock tRPC to avoid context issues
vi.mock('../lib/trpc', () => ({
  trpc: {
    finance: {
      associations: {
        list: {
          useQuery: () => ({ data: undefined }),
        },
        search: {
          useMutation: () => ({
            mutateAsync: vi.fn().mockResolvedValue(undefined),
          }),
        },
        create: {
          useMutation: () => ({
            mutateAsync: vi.fn().mockResolvedValue({ _id: 'new_assoc', name: 'New Association' }),
          }),
        },
      },
      contacts: {
        list: {
          useQuery: () => ({ data: undefined }),
        },
        search: {
          useMutation: () => ({
            mutateAsync: vi.fn().mockResolvedValue(undefined),
          }),
        },
        create: {
          useMutation: () => ({
            mutateAsync: vi.fn().mockResolvedValue({ _id: 'new_contact', name: 'New Contact' }),
          }),
        },
      },
    },
    teams: {
      seasons: {
        useQuery: () => ({ data: undefined }),
      },
    },
  },
}));

// Mock AssociationContactForm to avoid tRPC context issues
vi.mock('../AssociationContactForm', () => ({
  AssociationContactForm: () => (
    <div>
      <textarea placeholder="paste text here"></textarea>
      <button>Auto-fill from text</button>
    </div>
  ),
}));

describe('OfferWizardStep1', () => {
  const mockOnContinue = vi.fn();
  const mockOnCancel = vi.fn();
  const testAssociations = [
    { _id: 'assoc1', name: 'Association 1' },
    { _id: 'assoc2', name: 'Association 2' },
  ];
  const testContacts = [
    { _id: 'contact1', name: 'Contact 1' },
    { _id: 'contact2', name: 'Contact 2' },
  ];
  const testSeasons = [
    { id: 1, name: 'Season 1' },
    { id: 2, name: 'Season 2' },
  ];

  beforeEach(() => {
    mockOnContinue.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders association and contact sections', () => {
    render(
      <OfferWizardStep1
        onContinue={mockOnContinue}
        onCancel={mockOnCancel}
        associations={testAssociations}
        contacts={testContacts}
        seasons={testSeasons}
      />
    );

    expect(screen.getByText(/Step 1:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('renders dropdown selectors', () => {
    render(
      <OfferWizardStep1
        onContinue={mockOnContinue}
        onCancel={mockOnCancel}
        associations={testAssociations}
        contacts={testContacts}
        seasons={testSeasons}
      />
    );

    // Should have selects for association, contact, and season
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders next button', () => {
    render(
      <OfferWizardStep1
        onContinue={mockOnContinue}
        onCancel={mockOnCancel}
        associations={testAssociations}
        contacts={testContacts}
        seasons={testSeasons}
      />
    );

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(
      <OfferWizardStep1
        onContinue={mockOnContinue}
        onCancel={mockOnCancel}
        associations={testAssociations}
        contacts={testContacts}
        seasons={testSeasons}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
