// src/client/components/Offer/Step2/__tests__/PricingSection.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingSection } from '../PricingSection';

describe('PricingSection', () => {
  const mockProps = {
    costModel: 'flatFee' as const,
    baseRateOverride: undefined,
    expectedTeamsCount: 5,
    onPricingChange: vi.fn(),
  };

  it('should render pricing fields', () => {
    render(<PricingSection {...mockProps} />);

    expect(screen.getByLabelText(/Cost Model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expected Teams/i)).toBeInTheDocument();
  });

  it('should call onPricingChange when fields change', async () => {
    const user = userEvent.setup();
    const onPricingChange = vi.fn();

    render(<PricingSection {...mockProps} onPricingChange={onPricingChange} />);

    const select = screen.getByLabelText(/Cost Model/i);
    await user.selectOptions(select, 'perGameDay');

    expect(onPricingChange).toHaveBeenCalledWith({ costModel: 'perGameDay' });
  });
});
