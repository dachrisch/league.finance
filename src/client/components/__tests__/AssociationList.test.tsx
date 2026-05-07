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

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
  });

  it('renders empty state when no associations', () => {
    render(<AssociationList associations={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No associations found/i)).toBeInTheDocument();
  });

  it('renders cards with associations', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Association 1')).toBeInTheDocument();
    expect(screen.getByText('Association 2')).toBeInTheDocument();
    expect(screen.getByText(/Street 1/i)).toBeInTheDocument();
    expect(screen.getByText(/City 1/i)).toBeInTheDocument();
  });

  it('calls onEdit when a card is clicked', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const card = screen.getByText('Association 1');
    fireEvent.click(card);

    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByTitle('Delete Association');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
    expect(mockOnEdit).not.toHaveBeenCalled();
  });
});
