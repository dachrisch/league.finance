export function buildStandardInvoiceAddress(
  associationName: string,
  address: { street: string; postalCode: string; city: string },
  contactName?: string | null
): string {
  const lines = [associationName];
  if (contactName) lines.push(`z.H. ${contactName}`);
  lines.push(address.street, `${address.postalCode} ${address.city}`.trim());
  return lines.join('\n');
}
