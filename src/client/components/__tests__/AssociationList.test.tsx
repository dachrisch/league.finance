import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssociationList } from '../AssociationList';
import { Association } from '../../lib/schemas';

describe('AssociationList', () => {
  const mockAssociations: Association[] = [
    {
      _id: '1',
      name: 'Association 1',
      address: {
        street: 'Street 1',
        postalCode: '12345',
        city: 'City 1',
        country: 'Germany',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: '2',
      name: 'Association 2',
      address: {
        street: 'Street 2',
        postalCode: '67890',
        city: 'City 2',
        country: 'Germany',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOnView = vi.fn();

  beforeEach(() => {
    mockOnView.mockClear();
  });

  it('renders empty state when no associations', () => {
    render(<AssociationList associations={[]} onView={mockOnView} />);
    expect(screen.getByText(/No associations found/i)).toBeInTheDocument();
  });

  it('renders table with associations', () => {
    render(<AssociationList associations={mockAssociations} onView={mockOnView} />);

    expect(screen.getByText('Association 1')).toBeInTheDocument();
    expect(screen.getByText('Association 2')).toBeInTheDocument();
    expect(screen.getByText(/Street 1, 12345 City 1, Germany/i)).toBeInTheDocument();
    expect(screen.getByText(/Street 2, 67890 City 2, Germany/i)).toBeInTheDocument();
  });

  it('calls onView when a row is clicked', () => {
    render(<AssociationList associations={mockAssociations} onView={mockOnView} />);

    const rows = screen.getAllByRole('row');
    // rows[0] is the header
    fireEvent.click(rows[1]);

    expect(mockOnView).toHaveBeenCalledWith('1');
  });

  it('renders table headers correctly', () => {
    render(<AssociationList associations={mockAssociations} onView={mockOnView} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });
});
