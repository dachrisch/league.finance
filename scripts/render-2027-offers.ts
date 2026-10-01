// scripts/render-2027-offers.ts — renders the 2027 renewal offers to ./tmp-offers for review.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PdfService } from '../src/server/services/PdfService';
import { offerLinesTotal, type OfferLine } from '../shared/lib/offerLines';

const date = new Date('2026-10-01T00:00:00Z');
const validUntil = new Date('2026-11-15T00:00:00Z');
const offers: Array<{ no: string; expected: number; recipient: any; lines: OfferLine[]; introNote?: string; closingNote?: string }> = [
  { no: '20261001-1', expected: 1440,
    recipient: { associationName: 'American Football Verband Bayern e.V.', contactName: 'Lynn Hoffer', street: 'Georg-Brauchle-Ring 93', postalCode: '80992', city: 'München' },
    lines: [
      { label: 'Grundpreis', amount: 600, kind: 'fee' },
      { label: 'Erwachsenenteams', detail: '35 Teams à 16 €', amount: 560, kind: 'fee' },
      { label: 'Jugendteams', detail: '35 Teams à 9 €', amount: 280, kind: 'fee' },
    ] },
  { no: '20261001-2', expected: 1904,
    recipient: { associationName: 'American Football und Cheerleading Verband Nordrhein-Westfalen e.V.', contactName: 'Fabian Pawlowski', street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
    lines: [
      { label: 'Regionalliga', detail: '12 Teams', amount: 648, kind: 'league' },
      { label: 'Oberliga', detail: '17 Teams', amount: 918, kind: 'league' },
      { label: 'U10', detail: '6 Teams', amount: 78, kind: 'league' },
      { label: 'U13', detail: '11 Teams', amount: 143, kind: 'league' },
      { label: 'U16', detail: '9 Teams', amount: 117, kind: 'league' },
    ] },
  { no: '20261001-3', expected: 1523.9, closingNote: 'Weitere Ligen berechnen wir mit 10 € pro Spieltag und Team.',
    recipient: { associationName: 'American Football und Cheerleading Verband Berlin-Brandenburg e. V.', contactName: 'Chris Claussen', street: 'Hanns-Braun-Straße 1', postalCode: '14053', city: 'Berlin' },
    lines: [
      { label: 'Oberliga Ost', detail: 'bis zu 20 Spieltage mit jeweils 6 Teams', amount: 900, kind: 'fee' },
      { label: 'U16 Sachsen', amount: 144, kind: 'league' },
      { label: 'U16 Thüringen', amount: 216, kind: 'league' },
      { label: 'U16 Sachsen-Anhalt', amount: 180, kind: 'league' },
      { label: 'U13 Mitteldeutschland', amount: 122, kind: 'league' },
      { label: 'U13 Mitteldeutschland', amount: 72, kind: 'league' },
      { label: '15 % Rabatt auf die Jugendligen', detail: 'auf 734,00 €', amount: -110.1, kind: 'discount' },
    ] },
  { no: '20261001-4', expected: 2484,
    recipient: { associationName: 'American Football Verband Deutschland e.V.', contactName: 'Max Keneder', street: 'Richard-Herrmann-Platz 1', postalCode: '60386', city: 'Frankfurt am Main' },
    lines: [
      { label: 'DFFL', detail: '16 Teams', amount: 864, kind: 'league' },
      { label: 'DFFL2', detail: '20 Teams', amount: 1080, kind: 'league' },
      { label: 'DFFLF', detail: '10 Teams', amount: 540, kind: 'league' },
      { label: 'DFFLF2', detail: '9 Teams', amount: 486, kind: 'optional' },
    ] },
  { no: '20261001-5', expected: 762,
    introNote: 'Wir schicken es bewusst früh, damit es in eure Budgetplanung für 2027 einfließen kann.',
    recipient: { associationName: 'American Football Verband Hessen e.V.', contactName: 'Michael Hanke', street: 'Postfach 15 02 51', postalCode: '60062', city: 'Frankfurt am Main' },
    lines: [
      { label: 'Grundpreis', amount: 600, kind: 'fee' },
      { label: 'Erwachsenenteams', detail: '9 Teams à 18 €', amount: 162, kind: 'fee' },
    ] },
];

async function main() {
  mkdirSync('tmp-offers', { recursive: true });
  for (const o of offers) {
    const total = offerLinesTotal(o.lines);
    if (total !== o.expected) throw new Error(`${o.no}: total ${total} != ${o.expected}`);
    const pdf = await PdfService.generateOfferPdf({ offerNumber: o.no, offerDate: date, validUntil, introNote: o.introNote,
      closingNote: o.closingNote, recipient: o.recipient, lines: o.lines, seasonName: '2027' });
    const name = PdfService.generateFilename(o.no, '2027');
    writeFileSync(`tmp-offers/${name}`, pdf);
    console.log(`${name}  ${total.toFixed(2)} €`);
  }
}

main();
