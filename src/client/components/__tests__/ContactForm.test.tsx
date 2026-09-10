import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '../ContactForm';
import { trpc } from '../../lib/trpc';

vi.mock('../../lib/trpc', () => ({
  trpc: {
    finance: {
      associations: {
        list: { useQuery: vi.fn() },
      },
    },
  },
}));

describe('ContactForm — association link', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockOnSubmit.mockClear();
    vi.mocked(trpc.finance.associations.list.useQuery).mockReturnValue({
      data: [{ _id: 'assoc-1', name: 'AFVH' }, { _id: 'assoc-2', name: 'AFVBy' }],
    } as any);
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/Contact Name/i), { target: { value: 'Michael Hanke' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'michael@afvh.de' } });
    fireEvent.change(screen.getByLabelText(/Street/i), { target: { value: 'Street 1' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'City' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '12345' } });
  };

  it('shows an association dropdown when not locked, and submits the chosen id', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Association/i), { target: { value: 'assoc-2' } });
    fireEvent.click(screen.getByText('Create Person'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(mockOnSubmit.mock.calls[0][0].associationId).toBe('assoc-2');
  });

  it('submits null when no association is chosen', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);
    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Person'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(mockOnSubmit.mock.calls[0][0].associationId).toBeNull();
  });

  it('hides the dropdown and forces the locked associationId when lockedAssociationId is given', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} lockedAssociationId="assoc-1" />);
    expect(screen.queryByLabelText(/Association/i)).not.toBeInTheDocument();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Person'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(mockOnSubmit.mock.calls[0][0].associationId).toBe('assoc-1');
  });
});
