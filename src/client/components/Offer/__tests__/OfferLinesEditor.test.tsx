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

  // F5: an empty Betrag becomes NaN, which the server would reject with a raw zod error;
  // validate client-side first and show the "Zeile X: …" message without saving.
  it('F5: validates lines before saving and shows the error inline without calling onSave', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.change(within(rows[0]).getByLabelText('Betrag'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Zeile 1: Betrag ungültig');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('F5: clears the error once the line is fixed and saves successfully', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.change(within(rows[0]).getByLabelText('Betrag'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(screen.getByRole('alert')).toBeTruthy();

    fireEvent.change(within(rows[0]).getByLabelText('Betrag'), { target: { value: '150' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  // F12: optional/discount rows can't be part of a discount's base.
  it('F12: disables the discount-selection checkbox for optional and discount rows', () => {
    const withDiscount = [
      lines[0], // league
      { label: '15% Rabatt', amount: -10, kind: 'discount' as const },
      lines[2], // optional (DFFLF2)
    ];
    render(<OfferLinesEditor lines={withDiscount} onSave={vi.fn()} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    expect(within(rows[0]).getByLabelText('Für Rabatt auswählen')).toBeEnabled();
    expect(within(rows[1]).getByLabelText('Für Rabatt auswählen')).toBeDisabled();
    expect(within(rows[2]).getByLabelText('Für Rabatt auswählen')).toBeDisabled();
  });

  it('is read-only for non-draft offers', () => {
    render(<OfferLinesEditor lines={lines} readOnly onSave={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Preise speichern' })).toBeNull();
    expect(screen.queryAllByLabelText('Bezeichnung')).toHaveLength(0);
  });

  it('clears the discount selection after deleting a line, so a later discount is not mis-targeted', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.click(within(rows[0]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.click(within(rows[1]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.click(within(rows[2]).getByRole('button', { name: 'Zeile löschen' }));
    fireEvent.change(screen.getByLabelText('Rabatt in %'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rabatt hinzufügen' }));
    // selection was cleared by the delete, so "Rabatt hinzufügen" is a no-op: no
    // discount line was appended, and the total is unaffected.
    expect(screen.getAllByTestId('offer-line-row')).toHaveLength(2);
    expect(screen.getByTestId('offer-lines-total')).toHaveTextContent('360,00 €');
  });

  it('clears the discount selection after moving a line, so a later discount is not mis-targeted', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.click(within(rows[0]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.click(within(screen.getAllByTestId('offer-line-row')[1]).getByRole('button', { name: 'Nach oben' }));
    fireEvent.change(screen.getByLabelText('Rabatt in %'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rabatt hinzufügen' }));
    expect(screen.getAllByTestId('offer-line-row')).toHaveLength(3);
    expect(screen.getByTestId('offer-lines-total')).toHaveTextContent('360,00 €');
  });

  it('keeps an unsaved added row when the lines prop is replaced by a new-but-equal array', () => {
    const onSave = vi.fn();
    const { rerender } = render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zeile hinzufügen' }));
    expect(screen.getAllByTestId('offer-line-row')).toHaveLength(4);

    // Simulate the parent re-rendering for an unrelated reason (e.g. typing in a
    // sibling form) and recreating the `lines` array with the same content but a
    // new reference/object identity.
    rerender(<OfferLinesEditor lines={JSON.parse(JSON.stringify(lines))} onSave={onSave} onGenerate={vi.fn()} />);

    expect(screen.getAllByTestId('offer-line-row')).toHaveLength(4);
  });
});
