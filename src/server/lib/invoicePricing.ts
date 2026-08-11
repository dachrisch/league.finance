export const VAT_RATE = 0.19;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolveLineAmount(
  chosenSource: 'offer' | 'live' | 'custom',
  offerPrice: number,
  livePrice: number,
  customPrice: number | null
): number | null {
  if (chosenSource === 'custom') return customPrice;
  return chosenSource === 'live' ? livePrice : offerPrice;
}

export function computeLineVat(amount: number): { vat: number; gross: number } {
  const vat = round2(amount * VAT_RATE);
  return { vat, gross: round2(amount + vat) };
}

export function computeDiscountAmount(
  subtotal: number,
  discount: { type: 'FIXED' | 'PERCENT'; value: number } | null | undefined
): number {
  if (!discount) return 0;
  return discount.type === 'FIXED' ? discount.value : round2((subtotal * discount.value) / 100);
}

export function computeInvoiceTotals(
  lineAmounts: number[],
  discount: { type: 'FIXED' | 'PERCENT'; value: number } | null | undefined
): { subtotal: number; discountAmount: number; netTotal: number; vatTotal: number; grossTotal: number } {
  const subtotal = round2(lineAmounts.reduce((sum, a) => sum + a, 0));
  const discountAmount = computeDiscountAmount(subtotal, discount);
  const netTotal = round2(subtotal - discountAmount);
  const vatTotal = round2(netTotal * VAT_RATE);
  const grossTotal = round2(netTotal + vatTotal);
  return { subtotal, discountAmount, netTotal, vatTotal, grossTotal };
}
