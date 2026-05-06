import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssociationContactForm } from '../AssociationContactForm';
import { trpc } from '../../lib/trpc';

// Mock trpc
vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(),
  },
}));

describe('AssociationContactForm', () => {
  const mockFetch = vi.fn();
  const mockUtils = {
    finance: {
      associations: {
        search: {
          fetch: mockFetch,
        },
      },
      contacts: {
        search: {
          fetch: mockFetch,
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trpc.useUtils).mockReturnValue(mockUtils as any);
  });

  it('renders textarea and auto-fill button', () => {
    const mockOnSubmit = vi.fn();
    render(
      <AssociationContactForm
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByPlaceholderText(/paste text/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auto-fill/i })).toBeInTheDocument();
  });

  it('displays fields after extraction', async () => {
    const mockOnSubmit = vi.fn();
    mockFetch.mockResolvedValue(null);

    render(
      <AssociationContactForm
        onSubmit={mockOnSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/paste text/i);
    fireEvent.change(textarea, {
      target: {
        value: `Organization
John Smith
Street 1
12345 City
Country`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Organization')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
  });

  it('requires email field to be filled before submit', async () => {
    const mockOnSubmit = vi.fn();
    mockFetch.mockResolvedValue(null);

    render(
      <AssociationContactForm
        onSubmit={mockOnSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/paste text/i);
    fireEvent.change(textarea, {
      target: {
        value: `Organization
John Smith
Street 1
12345 City
Country`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    // Should show error about missing email
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct data', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockFetch.mockResolvedValue(null);

    render(
      <AssociationContactForm
        onSubmit={mockOnSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/paste text/i);
    fireEvent.change(textarea, {
      target: {
        value: `Test e.V.
John Smith
john@example.com
Hauptstraße 1
12345 Berlin
Germany`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          association: expect.objectContaining({
            name: 'Test e.V.',
            address: expect.objectContaining({
              street: 'Hauptstraße 1',
              city: 'Berlin',
              postalCode: '12345',
              country: 'Germany',
            }),
          }),
          contact: expect.objectContaining({
            name: 'John Smith',
            email: 'john@example.com',
          }),
        })
      );
    });
  });

  it('shows duplicate warnings when entities exist', async () => {
    const mockOnSubmit = vi.fn();
    mockFetch.mockImplementation(({ name, email }: any) => {
      if (name === 'Existing Org') return Promise.resolve({ _id: 'assoc1', name: 'Existing Org' });
      if (email === 'existing@example.com') return Promise.resolve({ _id: 'contact1', name: 'Existing Contact' });
      return Promise.resolve(null);
    });

    render(
      <AssociationContactForm
        onSubmit={mockOnSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/paste text/i);
    fireEvent.change(textarea, {
      target: {
        value: `Existing Org
Existing Contact
existing@example.com
Street 1
12345 City
Germany`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    // Both warnings should appear
    const warnings = await screen.findAllByText(/already exists/i);
    expect(warnings).toHaveLength(2);
    
    expect(warnings[0].textContent).toContain('Existing Org');
    expect(warnings[1].textContent).toContain('Existing Contact');
  });
});
