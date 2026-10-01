import { useEffect, useRef, useState } from 'react';
import { offerLinesTotal, percentDiscountLine, validateOfferLines, type OfferLine, type OfferLineKind } from '../../../../shared/lib/offerLines';

const euro = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const KINDS: Array<[OfferLineKind, string]> = [['league', 'Liga'], ['fee', 'Gebühr'], ['discount', 'Rabatt'], ['optional', 'Optional']];

interface Props {
  lines: OfferLine[];
  readOnly?: boolean;
  saving?: boolean;
  onSave: (lines: OfferLine[]) => void;
  onGenerate: () => void;
}

/** Ordered price lines of an offer: edit, reorder, add a % discount, save as a whole. */
export function OfferLinesEditor({ lines, readOnly, saving, onSave, onGenerate }: Props) {
  const [draft, setDraft] = useState<OfferLine[]>(lines);
  const [selected, setSelected] = useState<number[]>([]);
  const [percent, setPercent] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Only re-seed the draft when the incoming lines actually changed (by content, not
  // by reference): the parent re-creates `lines` as a new array/object on every
  // render it does for unrelated reasons (e.g. typing in a sibling form, or a
  // refetch that still resolves to the same lines), and a naive `[lines]` dependency
  // would wipe any unsaved in-progress edits on each of those renders.
  const lastLinesKey = useRef(JSON.stringify(lines));
  useEffect(() => {
    const key = JSON.stringify(lines);
    if (key === lastLinesKey.current) return;
    lastLinesKey.current = key;
    setDraft(lines);
  }, [lines]);

  const update = (i: number, patch: Partial<OfferLine>) => {
    setError(null);
    setDraft((d) => d.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  };
  // Selected indexes target specific draft rows for a discount; once rows move or
  // are removed those indexes point at different rows, so any pending selection
  // is cleared rather than silently discounting the wrong lines.
  const move = (i: number, dir: -1 | 1) => {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSelected([]);
  };
  const addDiscount = () => {
    const p = Number(percent.replace(',', '.'));
    if (!selected.length || !(p > 0)) return;
    setDraft((d) => [...d, percentDiscountLine(d, selected, p)]);
    setSelected([]);
    setPercent('');
  };
  const clean = (l: OfferLine): OfferLine => {
    const { detail, leagueId, ...rest } = l;
    return { ...rest, ...(detail ? { detail } : {}), ...(leagueId ? { leagueId } : {}) };
  };
  // An empty Betrag input becomes NaN (see the amount onChange below), which the server
  // schema rejects as a raw, unfriendly zod error; validate client-side first and show the
  // same "Zeile X: …" message the server would, without sending the request.
  const handleSave = () => {
    const cleaned = draft.map(clean);
    const invalid = validateOfferLines(cleaned);
    if (invalid) {
      setError(`Zeile ${invalid.index + 1}: ${invalid.message}`);
      return;
    }
    setError(null);
    onSave(cleaned);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {!readOnly && <th aria-label="Auswahl" />}
              <th>Bezeichnung</th><th>Detail</th><th>Art</th><th style={{ textAlign: 'right' }}>Betrag</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {draft.map((l, i) => (
              <tr key={i} data-testid="offer-line-row">
                {readOnly ? (
                  <>
                    <td>{l.label}</td><td>{l.detail}</td>
                    <td>{KINDS.find(([k]) => k === l.kind)?.[1]}</td>
                    <td style={{ textAlign: 'right' }}>{euro(l.amount)}</td>
                  </>
                ) : (
                  <>
                    <td><input type="checkbox" aria-label="Für Rabatt auswählen" checked={selected.includes(i)}
                      disabled={l.kind === 'optional' || l.kind === 'discount'}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i] : s.filter((x) => x !== i)))} /></td>
                    <td><input aria-label="Bezeichnung" value={l.label} onChange={(e) => update(i, { label: e.target.value })} /></td>
                    <td><input aria-label="Detail" value={l.detail ?? ''} onChange={(e) => update(i, { detail: e.target.value })} /></td>
                    <td>
                      <select aria-label="Art" value={l.kind} onChange={(e) => update(i, { kind: e.target.value as OfferLineKind })}>
                        {KINDS.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
                      </select>
                    </td>
                    <td><input aria-label="Betrag" type="number" step="0.01" style={{ textAlign: 'right', width: '8em' }}
                      value={Number.isFinite(l.amount) ? l.amount : ''}
                      onChange={(e) => update(i, { amount: e.target.value === '' ? Number.NaN : Number(e.target.value) })} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-secondary" aria-label="Nach oben" onClick={() => move(i, -1)}>↑</button>
                      <button type="button" className="btn btn-secondary" aria-label="Nach unten" onClick={() => move(i, 1)}>↓</button>
                      <button type="button" className="btn btn-secondary" aria-label="Zeile löschen"
                        onClick={() => { setDraft((d) => d.filter((_, j) => j !== i)); setSelected([]); }}>✕</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={readOnly ? 3 : 4}><strong>Gesamt (zzgl. MwSt., ohne optionale Zeilen)</strong></td>
              <td style={{ textAlign: 'right' }} data-testid="offer-lines-total"><strong>{euro(offerLinesTotal(draft.filter((l) => Number.isFinite(l.amount))))}</strong></td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {error && <p role="alert" style={{ color: 'var(--danger-color)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary"
              onClick={() => setDraft((d) => [...d, { label: '', amount: 0, kind: 'fee' }])}>Zeile hinzufügen</button>
            <button type="button" className="btn btn-secondary" onClick={onGenerate}>Aus Ligen erzeugen</button>
            <label>Rabatt in %
              <input aria-label="Rabatt in %" inputMode="decimal" style={{ width: '4em', marginLeft: 4 }}
                value={percent} onChange={(e) => setPercent(e.target.value)} />
            </label>
            <button type="button" className="btn btn-secondary" onClick={addDiscount}>Rabatt hinzufügen</button>
            <button type="button" className="btn btn-primary" disabled={saving}
              onClick={handleSave}>Preise speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}
