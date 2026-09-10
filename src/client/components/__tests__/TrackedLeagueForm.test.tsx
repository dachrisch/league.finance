import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackedLeagueForm } from '../TrackedLeagueForm';

describe('TrackedLeagueForm', () => {
  const contacts = [{ _id: 'contact-1', name: 'Michael Hanke' }];

  it('requires a name', async () => {
    const onSubmit = vi.fn();
    render(<TrackedLeagueForm associationId="assoc-1" contacts={contacts} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Add League'));

    expect(await screen.findByText(/League name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with the association id, chosen contact, and defaults', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TrackedLeagueForm associationId="assoc-1" contacts={contacts} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/League Name/i), { target: { value: 'Regionalliga Hessen' } });
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Contact/i), { target: { value: 'contact-1' } });
    fireEvent.click(screen.getByText('Add League'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      associationId: 'assoc-1',
      contactId: 'contact-1',
      name: 'Regionalliga Hessen',
      year: 2026,
      isYouth: false,
      status: 'lead',
    }));
  });

  it('shows a derived-status note instead of the status field when linked to an offer', () => {
    render(
      <TrackedLeagueForm
        associationId="assoc-1"
        contacts={contacts}
        initialData={{ name: 'Regionalliga Hessen', year: 2026, linkedOfferId: 'offer-1' }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/^Status$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/derived from the linked offer/i)).toBeInTheDocument();
  });
});
