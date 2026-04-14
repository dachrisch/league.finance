import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummarySection } from '../SummarySection';

describe('SummarySection', () => {
  const mockProps = {
    associationName: 'AFCV NRW e.V.',
    contactName: 'Fabian Pawlowski',
    seasonYear: '2025',
    onEdit: vi.fn(),
  };

  it('should render summary information', () => {
    render(<SummarySection {...mockProps} />);

    expect(screen.getByText('AFCV NRW e.V.')).toBeInTheDocument();
    expect(screen.getByText('Fabian Pawlowski')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should call onEdit when Edit link clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(<SummarySection {...mockProps} onEdit={onEdit} />);

    const editButton = screen.getByText(/Edit/i);
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalled();
  });
});
