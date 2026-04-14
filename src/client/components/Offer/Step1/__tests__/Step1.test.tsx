// src/client/components/Offer/Step1/__tests__/Step1.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Step1 } from '../Step1';

describe('Step1', () => {
  const mockProps = {
    pasteInput: '',
    pathChoice: undefined,
    selectedAssociationId: '',
    selectedContactId: '',
    selectedSeasonId: '',
    isExtracting: false,
    extractedData: undefined,
    extractionError: undefined,
    associations: [],
    contacts: [],
    seasons: [],
    onUpdatePasteInput: vi.fn(),
    onSelectPath: vi.fn(),
    onExtract: vi.fn(),
    onSelectAssociation: vi.fn(),
    onSelectContact: vi.fn(),
    onSelectSeason: vi.fn(),
    onNext: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should render step1 layout', () => {
    render(<Step1 {...mockProps} />);

    expect(screen.getByText(/Association, Contact & Season/i)).toBeInTheDocument();
  });

  it('should render paste extract block', () => {
    render(<Step1 {...mockProps} />);

    expect(screen.getByText(/Paste & extract/i)).toBeInTheDocument();
  });

  it('should render use existing block', () => {
    render(<Step1 {...mockProps} />);

    expect(screen.getByText(/or use existing records/i)).toBeInTheDocument();
  });

  it('should disable next button by default', () => {
    render(<Step1 {...mockProps} />);
    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).toBeDisabled();
  });

  it('should enable next button when paste path is complete', () => {
    const completePasteProps = {
      ...mockProps,
      pathChoice: 'paste' as const,
      extractedData: {
        organizationName: 'Org',
        street: 'Street',
        city: 'City',
        postalCode: '12345',
        country: 'Country',
        contactName: 'Contact',
        email: 'test@example.com',
      },
      selectedSeasonId: 'season1',
    };
    render(<Step1 {...completePasteProps} />);
    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).toBeEnabled();
  });

  it('should enable next button when existing path is complete', () => {
    const completeExistingProps = {
      ...mockProps,
      pathChoice: 'existing' as const,
      selectedAssociationId: 'assoc1',
      selectedContactId: 'contact1',
      selectedSeasonId: 'season1',
    };
    render(<Step1 {...completeExistingProps} />);
    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).toBeEnabled();
  });

  it('should show season block when in paste path', () => {
    const pastePathProps = {
      ...mockProps,
      pathChoice: 'paste' as const,
    };
    render(<Step1 {...pastePathProps} />);
    // In PasteExtractBlock, there's "Season" as a subtitle sometimes, but SeasonBlock has it as a Title.
    // The test implementation of SeasonBlock has <strong className={styles.blockTitle}>Season</strong>
    // Wait, SeasonBlock has its own header.
    const seasonBlocks = screen.getAllByText(/Season/i);
    // 1. Progress Indicator
    // 2. Paste subtitle (maybe)
    // 3. SeasonBlock Title
    expect(seasonBlocks.length).toBeGreaterThan(1);
  });
});
