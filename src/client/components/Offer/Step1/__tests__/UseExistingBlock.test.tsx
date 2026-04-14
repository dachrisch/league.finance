// src/client/components/Offer/Step1/__tests__/UseExistingBlock.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UseExistingBlock } from '../UseExistingBlock';

describe('UseExistingBlock', () => {
  const mockAssociations = [
    { _id: 'assoc1', name: 'Association 1' },
    { _id: 'assoc2', name: 'Association 2' },
  ];
  const mockContacts = [
    { _id: 'cont1', name: 'Contact 1' },
    { _id: 'cont2', name: 'Contact 2' },
  ];
  const mockSeasons = [
    { _id: 'seas1', name: '2024', year: '2024' },
    { _id: 'seas2', name: '2025', year: '2025' },
  ];

  const defaultProps = {
    associations: mockAssociations,
    contacts: mockContacts,
    seasons: mockSeasons,
    onAssociationChange: vi.fn(),
    onContactChange: vi.fn(),
    onSeasonChange: vi.fn(),
    isActive: true,
    onToggle: vi.fn(),
  };

  it('should render dropdowns for association, contact, and season', () => {
    render(<UseExistingBlock {...defaultProps} />);

    expect(screen.getByLabelText(/Association \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Season \*/i)).toBeInTheDocument();
  });

  it('should call onAssociationChange when an association is selected', async () => {
    const user = userEvent.setup();
    const onAssociationChange = vi.fn();
    render(<UseExistingBlock {...defaultProps} onAssociationChange={onAssociationChange} />);

    const select = screen.getByLabelText(/Association \*/i);
    await user.selectOptions(select, 'assoc2');

    expect(onAssociationChange).toHaveBeenCalledWith('assoc2');
  });

  it('should call onContactChange when a contact is selected', async () => {
    const user = userEvent.setup();
    const onContactChange = vi.fn();
    render(<UseExistingBlock {...defaultProps} onContactChange={onContactChange} selectedAssociationId="assoc1" />);

    const select = screen.getByLabelText(/Contact \*/i);
    await user.selectOptions(select, 'cont2');

    expect(onContactChange).toHaveBeenCalledWith('cont2');
  });

  it('should call onSeasonChange when a season is selected', async () => {
    const user = userEvent.setup();
    const onSeasonChange = vi.fn();
    render(<UseExistingBlock {...defaultProps} onSeasonChange={onSeasonChange} />);

    const select = screen.getByLabelText(/Season \*/i);
    await user.selectOptions(select, 'seas2');

    expect(onSeasonChange).toHaveBeenCalledWith('seas2');
  });
  
  it('should call onToggle when header is clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<UseExistingBlock {...defaultProps} onToggle={onToggle} isActive={false} />);
      
      const header = screen.getByText(/Pick existing/i);
      await user.click(header);
      
      expect(onToggle).toHaveBeenCalled();
  });
});
