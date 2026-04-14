import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssociationContactForm } from '../AssociationContactForm';

describe('AssociationContactForm', () => {
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

  it('displays fields after extraction', () => {
    const mockOnSubmit = vi.fn();

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

    expect(screen.getByDisplayValue('Organization')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
  });

  it('requires email field to be filled before submit', () => {
    const mockOnSubmit = vi.fn();

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

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    // Should show error about missing email
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct data', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

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
john@example.com
Street 1
12345 City
Country`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          association: expect.objectContaining({
            name: 'Organization',
            address: expect.objectContaining({
              street: 'Street 1',
              city: 'City',
              postalCode: '12345',
              country: 'Country',
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

  it('disables extracted fields on high confidence', () => {
    const mockOnSubmit = vi.fn();

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
john@realcompany.com
Street 1
12345 City
Country`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    const orgInput = screen.getByDisplayValue('Organization') as HTMLInputElement;
    expect(orgInput.disabled).toBe(true);
  });

  it('shows warning banner on low confidence extraction', () => {
    const mockOnSubmit = vi.fn();

    render(
      <AssociationContactForm
        onSubmit={mockOnSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(/paste text/i);
    fireEvent.change(textarea, {
      target: {
        value: `Organization
John Smith`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    // Low confidence should show warning
    expect(screen.getByText(/please review/i)).toBeInTheDocument();
  });

  it('allows email modification on high confidence', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

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
john@example.com
Street 1
12345 City
Country`,
      },
    });

    const autoFillButton = screen.getByRole('button', { name: /auto-fill/i });
    fireEvent.click(autoFillButton);

    const emailInput = screen.getByDisplayValue('john@example.com') as HTMLInputElement;
    // Email should not be disabled even on high confidence
    expect(emailInput.disabled).toBe(false);

    // Modify email
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          contact: expect.objectContaining({
            email: 'newemail@example.com',
          }),
        })
      );
    });
  });
});
