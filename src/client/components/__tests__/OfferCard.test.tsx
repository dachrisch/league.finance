import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OfferCard } from '../OfferCard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the router navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('OfferCard', () => {
  const defaultProps = {
    id: 'offer-123',
    associationName: 'Test Association',
    seasonName: '2024-2025',
    contactName: 'John Doe',
    leagueCount: 3,
    leagueNames: ['League A', 'League B', 'League C'],
    status: 'draft' as const,
    createdAt: new Date('2026-04-10'),
    isExpanded: false,
    onToggleExpand: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collapsed state with summary info', () => {
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Association')).toBeInTheDocument();
    expect(screen.getByText(/Season:/)).toBeInTheDocument();
    expect(screen.getByText(/2024-2025/)).toBeInTheDocument();
    expect(screen.getByText(/Contact:/)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/3 selected/)).toBeInTheDocument();
  });

  it('displays status badge with correct status', () => {
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} status="sent" />
      </BrowserRouter>
    );

    expect(screen.getByText('SENT')).toBeInTheDocument();
  });

  it('shows View, Send, Delete buttons in draft status', () => {
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} status="draft" />
      </BrowserRouter>
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows only View button in sent status', () => {
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} status="sent" />
      </BrowserRouter>
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Send')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows only View button in accepted status', () => {
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} status="accepted" />
      </BrowserRouter>
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Send')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls onToggleExpand when header is clicked', () => {
    const onToggleExpand = vi.fn();
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} onToggleExpand={onToggleExpand} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Test Association'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} status="draft" onDelete={onDelete} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('calls onSend when Send button is clicked', () => {
    const onSend = vi.fn();
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} status="draft" onSend={onSend} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Send'));
    expect(onSend).toHaveBeenCalled();
  });

  it('renders expanded content when isExpanded is true', () => {
    const childContent = <div>Expanded Content</div>;
    render(
      <BrowserRouter>
        <OfferCard {...defaultProps} isExpanded={true}>
          {childContent}
        </OfferCard>
      </BrowserRouter>
    );

    expect(screen.getByText('Expanded Content')).toBeInTheDocument();
  });

  it('truncates league names when more than 3', () => {
    render(
      <BrowserRouter>
        <OfferCard
          {...defaultProps}
          leagueCount={5}
          leagueNames={['League A', 'League B', 'League C', 'League D', 'League E']}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/League A, League B, League C\.\.\./)).toBeInTheDocument();
  });

  it('shows chevron pointing down when expanded', () => {
    const { container } = render(
      <BrowserRouter>
        <OfferCard {...defaultProps} isExpanded={true} />
      </BrowserRouter>
    );

    expect(container.textContent).toContain('▼');
  });

  it('shows chevron pointing right when collapsed', () => {
    const { container } = render(
      <BrowserRouter>
        <OfferCard {...defaultProps} isExpanded={false} />
      </BrowserRouter>
    );

    expect(container.textContent).toContain('▶');
  });
});
