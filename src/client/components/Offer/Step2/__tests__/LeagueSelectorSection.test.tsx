// src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeagueSelectorSection } from '../LeagueSelectorSection';

describe('LeagueSelectorSection', () => {
  const mockLeagues = [
    { _id: 'l1', name: 'Regionalliga Nord', type: 'Regional' },
    { _id: 'l2', name: 'Regionalliga Süd', type: 'Regional' },
    { _id: 'l3', name: 'U19 Jugendliga', type: 'Youth' },
  ];

  const mockProps = {
    leagues: mockLeagues,
    selectedIds: [],
    searchTerm: '',
    filterType: 'All' as any,
    onToggleLeague: vi.fn(),
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSelectAll: vi.fn(),
    onClearAll: vi.fn(),
  };

  it('should render league categories', () => {
    render(<LeagueSelectorSection {...mockProps} />);

    // Use getAllByText and check if at least one exists, or be more specific
    expect(screen.getAllByText(/Regional/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Youth/i).length).toBeGreaterThan(0);
  });

  it('should call onSearchChange when typing in search box', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    
    // To properly test controlled input in a unit test without a wrapper, 
    // we just check that it's called with the first character if we don't re-render with new prop.
    // Or we can just check if it was called.
    render(<LeagueSelectorSection {...mockProps} onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText(/Search leagues/i);
    await user.type(input, 'N');

    expect(onSearchChange).toHaveBeenCalledWith('N');
  });

  it('shows a filtered banner and calls onToggle when the association filter is active', () => {
    const onToggle = vi.fn();
    render(
      <LeagueSelectorSection
        {...mockProps}
        associationFilter={{
          linked: true,
          filtering: true,
          associationName: 'AFCV NRW',
          seasonName: '2026',
          onToggle,
        }}
      />
    );

    expect(screen.getByText(/Showing leagues for/i)).toBeInTheDocument();
    expect(screen.getByText('AFCV NRW')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show all leagues/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows an unfiltered banner when the association filter is linked but off', () => {
    render(
      <LeagueSelectorSection
        {...mockProps}
        associationFilter={{
          linked: true,
          filtering: false,
          associationName: 'AFCV NRW',
          seasonName: '2026',
          onToggle: vi.fn(),
        }}
      />
    );

    expect(screen.getByText(/Showing all leagues/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filter to AFCV NRW/i })).toBeInTheDocument();
  });

  it('renders no banner when the association is not linked', () => {
    render(<LeagueSelectorSection {...mockProps} />);
    expect(screen.queryByText(/Showing leagues for/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing all leagues/i)).not.toBeInTheDocument();
  });
});
