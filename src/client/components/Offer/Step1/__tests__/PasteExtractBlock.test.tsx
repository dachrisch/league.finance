// src/client/components/Offer/Step1/__tests__/PasteExtractBlock.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasteExtractBlock } from '../PasteExtractBlock';

describe('PasteExtractBlock', () => {
  it('should render paste input field', () => {
    const props = {
      pasteInput: '',
      isExtracting: false,
      extractionError: undefined,
      extractedData: undefined,
      onInputChange: vi.fn(),
      onExtract: vi.fn(),
    };

    render(<PasteExtractBlock {...props} />);

    expect(
      screen.getByLabelText(/Paste organization & contact text/i)
    ).toBeInTheDocument();
  });

  it('should call onExtract when auto-fill button clicked', async () => {
    const user = userEvent.setup();
    const onExtract = vi.fn();

    const props = {
      pasteInput: 'AFCV NRW\nFabian\nf@example.com',
      isExtracting: false,
      extractionError: undefined,
      extractedData: undefined,
      onInputChange: vi.fn(),
      onExtract,
    };

    render(<PasteExtractBlock {...props} />);

    const button = screen.getByRole('button', { name: /Auto-fill/i });
    await user.click(button);

    expect(onExtract).toHaveBeenCalledWith(
      'AFCV NRW\nFabian\nf@example.com'
    );
  });

  it('should display extracted fields when available', () => {
    const props = {
      pasteInput: '',
      isExtracting: false,
      extractionError: undefined,
      extractedData: {
        organizationName: 'AFCV NRW e.V.',
        street: 'Halterner Straße 193',
        city: 'Marl',
        postalCode: '45770',
        country: 'Germany',
        contactName: 'Fabian Pawlowski',
        email: 'f.pawlowski@example.com',
        phone: '+49 123 456789',
      },
      onInputChange: vi.fn(),
      onExtract: vi.fn(),
    };

    render(<PasteExtractBlock {...props} />);

    expect(screen.getByDisplayValue('AFCV NRW e.V.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fabian Pawlowski')).toBeInTheDocument();
  });

  it('should disable auto-fill button when input is empty', () => {
    const props = {
      pasteInput: '',
      isExtracting: false,
      extractionError: undefined,
      extractedData: undefined,
      onInputChange: vi.fn(),
      onExtract: vi.fn(),
    };

    render(<PasteExtractBlock {...props} />);

    const button = screen.getByRole('button', { name: /Auto-fill/i });
    expect(button).toBeDisabled();
  });
});
