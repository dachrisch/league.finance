// src/client/components/Offer/Step2/__tests__/Step2.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Step2 } from '../Step2';

describe('Step2', () => {
  const mockProps = {
    summary: {
      associationName: 'Test Assoc',
      contactName: 'Test Contact',
      seasonYear: '2025',
    },
    pricing: {
      costModel: 'flatFee' as const,
      expectedTeamsCount: 5,
    },
    leagues: [],
    selectedLeagueIds: [],
    leagueSearchTerm: '',
    leagueFilterType: 'All' as any,
    onBack: vi.fn(),
    onCancel: vi.fn(),
    onCreate: vi.fn(),
    onPricingChange: vi.fn(),
    onToggleLeague: vi.fn(),
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSelectAll: vi.fn(),
    onClearAll: vi.fn(),
    onEditStep1: vi.fn(),
    isSubmitting: false,
  };

  it('should render step2 layout', () => {
    render(<Step2 {...mockProps} />);

    expect(screen.getByText(/Pricing & Leagues/i)).toBeInTheDocument();
  });

  it('should render summary, pricing and league sections', () => {
    render(<Step2 {...mockProps} />);

    expect(screen.getByText(/Review Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Pricing Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/League Selection/i)).toBeInTheDocument();
  });
});
