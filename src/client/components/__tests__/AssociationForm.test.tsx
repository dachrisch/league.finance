import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssociationForm } from '../AssociationForm';

describe('AssociationForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders form with all fields', () => {
    render(<AssociationForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/Association Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Association/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<AssociationForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /Create Association/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Association name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const successSubmit = vi.fn(() => Promise.resolve());
    render(<AssociationForm onSubmit={successSubmit} />);

    const nameInput = screen.getByLabelText(/Association Name/i) as HTMLInputElement;
    const streetInput = screen.getByLabelText(/Street/i) as HTMLInputElement;
    const postalCodeInput = screen.getByLabelText(/Postal Code/i) as HTMLInputElement;
    const cityInput = screen.getByLabelText(/City/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Test Association' } });
    fireEvent.change(streetInput, { target: { value: 'Teststrasse 1' } });
    fireEvent.change(postalCodeInput, { target: { value: '12345' } });
    fireEvent.change(cityInput, { target: { value: 'Berlin' } });

    const submitButton = screen.getByRole('button', { name: /Create Association/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(successSubmit).toHaveBeenCalledWith({
        name: 'Test Association',
        address: {
          street: 'Teststrasse 1',
          postalCode: '12345',
          city: 'Berlin',
          country: 'Germany',
        },
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = vi.fn();
    render(<AssociationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables form during submission', async () => {
    render(<AssociationForm onSubmit={vi.fn()} isLoading={true} />);

    const nameInput = screen.getByLabelText(/Association Name/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /Creating/i });

    expect(nameInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});
