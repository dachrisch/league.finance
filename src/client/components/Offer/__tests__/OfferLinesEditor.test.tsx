import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { OfferLinesEditor } from '../OfferLinesEditor';

const lines = [
  { label: 'U16 Sachsen', amount: 144, kind: 'league' as const },
  { label: 'U16 Thüringen', amount: 216, kind: 'league' as const },
  { label: 'DFFLF2', amount: 486, kind: 'optional' as const },
];

describe('OfferLinesEditor', () => {
  it('shows the total without optional lines', () => {
    render(<OfferLinesEditor lines={lines} onSave={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.getByTestId('offer-lines-total')).toHaveTextContent('360,00 €');
  });

  it('adds, edits and deletes lines and saves the result', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zeile hinzufügen' }));
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.change(within(rows[3]).getByLabelText('Bezeichnung'), { target: { value: 'Grundpreis' } });
    fireEvent.change(within(rows[3]).getByLabelText('Betrag'), { target: { value: '600' } });
    fireEvent.change(within(rows[3]).getByLabelText('Art'), { target: { value: 'fee' } });
    fireEvent.click(within(rows[2]).getByRole('button', { name: 'Zeile löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(onSave).toHaveBeenCalledWith([
      lines[0], lines[1], { label: 'Grundpreis', amount: 600, kind: 'fee' },
    ]);
  });

  it('adds a percent discount on the selected lines', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.click(within(rows[0]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.click(within(rows[1]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.change(screen.getByLabelText('Rabatt in %'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rabatt hinzufügen' }));
    expect(screen.getByTestId('offer-lines-total')).toHaveTextContent('306,00 €');
  });

  it('moves a line up', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    fireEvent.click(within(screen.getAllByTestId('offer-line-row')[1]).getByRole('button', { name: 'Nach oben' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(onSave.mock.calls[0][0][0].label).toBe('U16 Thüringen');
  });

  it('is read-only for non-draft offers', () => {
    render(<OfferLinesEditor lines={lines} readOnly onSave={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Preise speichern' })).toBeNull();
    expect(screen.queryAllByLabelText('Bezeichnung')).toHaveLength(0);
  });
});
