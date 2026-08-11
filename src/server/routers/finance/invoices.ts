import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { Offer } from '../../models/Offer';
import { Association } from '../../models/Association';
import { Contact } from '../../models/Contact';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { Invoice } from '../../models/Invoice';
import { InvoiceLineItem } from '../../models/InvoiceLineItem';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { resolveLineItemPricing } from '../../lib/invoiceLinePricing';
import { resolveSeasonName } from '../../lib/seasonName';
import { computeInvoiceTotals, computeLineVat } from '../../lib/invoicePricing';
import { InvoiceStatusSchema } from '../../../../shared/schemas/invoice';

const normalizeInvoice = (doc: any) => ({
  ...(doc.toObject?.() || doc),
  _id: doc._id.toString(),
  offerId: doc.offerId?.toString?.() ?? doc.offerId,
  contactId: doc.contactId?.toString?.() ?? doc.contactId,
});

async function fetchLeaguesMap(leagueIds: number[]): Promise<Record<number, string>> {
  if (leagueIds.length === 0) return {};
  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, name FROM gamedays_league WHERE id IN (?)',
      [leagueIds]
    );
    return rows.reduce((acc: Record<number, string>, row: any) => {
      acc[row.id] = row.name;
      return acc;
    }, {});
  } catch (err) {
    console.error('Failed to fetch league names:', err);
    return {};
  }
}

async function assertOfferAccepted(offerId: string) {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer not found' });
  if (offer.status !== 'accepted') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only accepted offers can be invoiced' });
  }
  return offer;
}

export const invoicesRouter = router({
  previewForOffer: protectedProcedure
    .input(z.object({ offerId: z.string() }))
    .query(async ({ input }) => {
      const offer = await assertOfferAccepted(input.offerId);
      const association = await Association.findById(offer.associationId);
      const configs = await FinancialConfig.find({ offerId: offer._id });

      const leaguesMap = await fetchLeaguesMap(configs.map((c) => c.leagueId));
      const pool = getMysqlPool();
      const settings = await getOrCreateSettings();
      const seasonName = await resolveSeasonName(pool, offer.seasonId);

      const alreadyInvoicedConfigIds = new Set(
        (await InvoiceLineItem.find({ financialConfigId: { $in: configs.map((c) => c._id) } }).lean())
          .map((li: any) => li.financialConfigId.toString())
      );

      const lines = await Promise.all(
        configs.map(async (config) => {
          const discounts = (await Discount.find({ configId: config._id }).lean()).map((d: any) => ({
            type: d.type, value: d.value,
          }));
          const pricing = await resolveLineItemPricing(
            config, leaguesMap[config.leagueId] || 'Unknown League', pool, settings, discounts
          );
          return { ...pricing, alreadyInvoiced: alreadyInvoicedConfigIds.has(config._id.toString()) };
        })
      );

      return {
        associationName: association?.name ?? 'Unknown Association',
        customerNumber: association?.customerNumber ?? null,
        seasonName,
        lines,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const invoice = await Invoice.findById(input.id);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });

      const [association, contact, rawLineItems] = await Promise.all([
        Association.findById(invoice.associationId).lean(),
        Contact.findById(invoice.contactId).lean(),
        InvoiceLineItem.find({ invoiceId: invoice._id }).sort({ createdAt: 1 }).lean(),
      ]);

      const leaguesMap = await fetchLeaguesMap(rawLineItems.map((li: any) => li.leagueId));

      const lineItems = rawLineItems.map((li: any) => {
        const { vat, gross } = computeLineVat(li.amount);
        return {
          ...li,
          _id: li._id.toString(),
          invoiceId: li.invoiceId.toString(),
          financialConfigId: li.financialConfigId.toString(),
          leagueName: leaguesMap[li.leagueId] || 'Unknown League',
          vat,
          gross,
        };
      });

      const totals = computeInvoiceTotals(
        lineItems.map((li) => li.amount),
        invoice.toObject().discount
      );

      return {
        invoice: normalizeInvoice(invoice),
        association: association ? { ...association, _id: association._id.toString() } : null,
        contact: contact ? { ...contact, _id: contact._id.toString() } : null,
        lineItems,
        totals,
      };
    }),

  list: protectedProcedure
    .input(z.object({ status: InvoiceStatusSchema.optional() }).optional())
    .query(async ({ input }) => {
      const query: any = {};
      if (input?.status) query.status = input.status;

      const invoices = await Invoice.find(query).sort({ createdAt: -1 }).lean();
      const invoiceIds = invoices.map((i: any) => i._id);
      const lineItems = await InvoiceLineItem.find({ invoiceId: { $in: invoiceIds } }).lean();

      const amountsByInvoiceId: Record<string, number[]> = {};
      for (const li of lineItems as any[]) {
        const key = li.invoiceId.toString();
        (amountsByInvoiceId[key] ||= []).push(li.amount);
      }

      return invoices.map((invoice: any) => {
        const totals = computeInvoiceTotals(amountsByInvoiceId[invoice._id.toString()] || [], invoice.discount);
        return { ...normalizeInvoice(invoice), grossTotal: totals.grossTotal };
      });
    }),
});