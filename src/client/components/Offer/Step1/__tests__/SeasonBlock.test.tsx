import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeasonBlock } from '../SeasonBlock';

describe('SeasonBlock', () => {
  const mockSeasons = [
    { _id: 'season1', name: '2025', slug: 'season-2025' },
    { _id: 'season2', name: '2026', slug: 'season-2026' },
  ];

  it('should render nothing if showBlock is false', () => {
    const { container } = render(
      <SeasonBlock
        seasons={mockSeasons}
        selectedSeasonId=""
        onSeasonChange={vi.fn()}
        showBlock={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render season select dropdown if showBlock is true', () => {
    render(
      <SeasonBlock
        seasons={mockSeasons}
        selectedSeasonId=""
        onSeasonChange={vi.fn()}
        showBlock={true}
      />
    );

    expect(screen.getByLabelText(/Season/i)).toBeInTheDocument();
    expect(screen.getByText(/-- Select season --/i)).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('should call onSeasonChange when selection changes', async () => {
    const user = userEvent.setup();
    const onSeasonChange = vi.fn();

    render(
      <SeasonBlock
        seasons={mockSeasons}
        selectedSeasonId=""
        onSeasonChange={onSeasonChange}
        showBlock={true}
      />
    );

    const select = screen.getByLabelText(/Season/i);
    await user.selectOptions(select, 'season1');

    expect(onSeasonChange).toHaveBeenCalledWith('season1');
  });

  it('should show information message when season is selected', () => {
    render(
      <SeasonBlock
        seasons={mockSeasons}
        selectedSeasonId="season1"
        onSeasonChange={vi.fn()}
        showBlock={true}
      />
    );

    expect(screen.getByText(/Selected season determines available leagues/i)).toBeInTheDocument();
  });

  it('should show done state when season is selected', () => {
    render(
      <SeasonBlock
        seasons={mockSeasons}
        selectedSeasonId="season1"
        onSeasonChange={vi.fn()}
        showBlock={true}
      />
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
  });
});
