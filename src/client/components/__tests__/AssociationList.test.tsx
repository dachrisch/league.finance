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

  it('renders table with associations', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Association 1')).toBeInTheDocument();
    expect(screen.getByText('Association 2')).toBeInTheDocument();
    expect(screen.getByText(/Street 1, 12345 City 1, Germany/i)).toBeInTheDocument();
    expect(screen.getByText(/Street 2, 67890 City 2, Germany/i)).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    global.confirm = vi.fn(() => true);
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('does not call onDelete if deletion is not confirmed', () => {
    global.confirm = vi.fn(() => false);
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    render(
      <AssociationList
        associations={mockAssociations}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('renders table headers correctly', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
