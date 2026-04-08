import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { Offer } from '../../models/Offer';
import { OfferLineItem } from '../../models/OfferLineItem';
import { Association } from '../../models/Association';
import { FinancialConfig } from '../../models/FinancialConfig';
import { calculateOfferLineItems } from '../../lib/offerCalculator';
import { generateOfferPDF } from '../../lib/pdfGenerator';
import { uploadPDFToDrive } from '../../lib/driveUploader';
import { generateOfferEmailSubject, generateOfferEmailBody } from '../../lib/emailTemplate';
import { sendOfferEmail } from '../../lib/emailSender';

export const offersRouter = router({
  // Task 10: Create new offer
  create: protectedProcedure
    .input(
      z.object({
        associationId: z.string(),
        seasonId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.findById(input.associationId);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Association not found' });
      }

      const offer = await Offer.create({
        associationId: input.associationId,
        seasonId: input.seasonId,
        selectedLeagueIds: [],
        status: 'DRAFT',
      });

      return offer;
    }),

  // Task 10: List offers with optional filters
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED']).optional(),
        associationId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const query: any = {};
      if (input.status) {
        query.status = input.status;
      }
      if (input.associationId) {
        query.associationId = input.associationId;
      }

      const offers = await Offer.find(query).sort({ createdAt: -1 });
      return offers;
    }),

  // Task 10: Get offer by ID with line items
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const lineItems = await OfferLineItem.find({ offerId: input.id });
      return { offer, lineItems };
    }),

  // Task 11: Update offer status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED']),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await Offer.findByIdAndUpdate(
        input.id,
        { status: input.status },
        { new: true }
      );
      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return offer;
    }),

  // Task 12: Add leagues to offer and calculate prices
  addLeagues: protectedProcedure
    .input(
      z.object({
        offerId: z.string(),
        leagueIds: z.array(z.number()),
        baseRate: z.number(),
        teams: z.record(z.string(), z.number()),
        participation: z.record(z.string(), z.number()),
        discounts: z.array(
          z.object({
            type: z.enum(['FIXED', 'PERCENT']),
            value: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer not found' });
      }

      // Get financial configs for selected leagues
      const configs = await FinancialConfig.find({
        leagueId: { $in: input.leagueIds },
        seasonId: offer.seasonId,
      });

      if (configs.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No financial configs found for selected leagues and season',
        });
      }

      // Calculate line items
      const leagueConfigsForCalc = configs.map((config) => ({
        leagueId: config.leagueId,
        leagueName: `League ${config.leagueId}`,
        costModel: config.costModel,
        baseRateOverride: config.baseRateOverride,
      }));

      const teamsMap = Object.entries(input.teams).reduce((acc, [key, val]) => {
        acc[parseInt(key)] = val;
        return acc;
      }, {} as Record<number, number>);

      const participationMap = Object.entries(input.participation).reduce((acc, [key, val]) => {
        acc[parseInt(key)] = val;
        return acc;
      }, {} as Record<number, number>);

      const lineItemsData = await calculateOfferLineItems(leagueConfigsForCalc, {
        baseRate: input.baseRate,
        teams: teamsMap,
        participation: participationMap,
        discounts: input.discounts,
        expectedTeamsCount: 0,
        expectedGamedaysCount: 0,
        expectedTeamsPerGameday: 0,
      });

      // Delete existing line items for this offer
      await OfferLineItem.deleteMany({ offerId: input.offerId });

      // Create new line items
      const createdLineItems = await OfferLineItem.insertMany(
        lineItemsData.map((item) => ({
          offerId: input.offerId,
          ...item,
        }))
      );

      // Update offer with selected league IDs
      offer.selectedLeagueIds = input.leagueIds;
      await offer.save();

      return { offer, lineItems: createdLineItems };
    }),

  // Task 13: Customize price for a league
  customizePrice: protectedProcedure
    .input(
      z.object({
        offerId: z.string(),
        leagueId: z.number(),
        customPrice: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const lineItem = await OfferLineItem.findOneAndUpdate(
        { offerId: input.offerId, leagueId: input.leagueId },
        { customPrice: input.customPrice },
        { new: true }
      );

      if (!lineItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Line item not found',
        });
      }

      return lineItem;
    }),

  // Task 14: Send offer via email
  send: protectedProcedure
    .input(
      z.object({
        offerId: z.string(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const association = await Association.findById(offer.associationId);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Association not found' });
      }

      const lineItems = await OfferLineItem.find({ offerId: input.offerId });

      // Generate PDF
      const pdfBuffer = await generateOfferPDF({
        associationName: association.name,
        seasonName: `Season ${offer.seasonId}`,
        createdAt: new Date(),
        lineItems: lineItems.map((item) => ({
          leagueId: item.leagueId,
          leagueName: item.leagueName,
          basePrice: item.basePrice,
          customPrice: item.customPrice,
          finalPrice: item.finalPrice,
        })),
      });

      // Upload to Google Drive (if token available)
      let driveFileId: string | null = null;
      let driveLink = '';

      if (process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
        const fileName = `${association.name}_Offer_${offer.seasonId}_${new Date().getTime()}.pdf`;
        driveFileId = await uploadPDFToDrive(
          pdfBuffer,
          process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
          fileName
        );
        driveLink = `https://drive.google.com/file/d/${driveFileId}/view`;
      }

      // Calculate total price
      const totalPrice = lineItems.reduce((sum, item) => sum + item.finalPrice, 0);

      // Generate email
      const subject = generateOfferEmailSubject(association.name, `Season ${offer.seasonId}`);
      const htmlBody = generateOfferEmailBody(
        association.name,
        `Season ${offer.seasonId}`,
        lineItems.map((item) => item.leagueName),
        totalPrice,
        driveLink || 'https://offers.leagues.finance'
      );

      // Send email
      await sendOfferEmail(input.to, input.cc || [], input.bcc || [], subject, htmlBody);

      // Update offer
      offer.status = 'SENT';
      offer.sentAt = new Date();
      offer.driveFileId = driveFileId;

      input.to.forEach((email) => {
        offer.sentTo.push({ email, sentAt: new Date() });
      });

      await offer.save();

      return { offer, driveFileId };
    }),

  // Task 15: Get offer summary with statistics
  summary: protectedProcedure.query(async () => {
    const totalOffers = await Offer.countDocuments();
    const draftOffers = await Offer.countDocuments({ status: 'DRAFT' });
    const sentOffers = await Offer.countDocuments({ status: 'SENT' });
    const acceptedOffers = await Offer.countDocuments({ status: 'ACCEPTED' });
    const rejectedOffers = await Offer.countDocuments({ status: 'REJECTED' });

    const allOffers = await Offer.find().lean();
    const totalValue = await OfferLineItem.aggregate([
      {
        $group: {
          _id: null,
          totalFinalPrice: {
            $sum: {
              $cond: ['$customPrice', '$customPrice', '$basePrice'],
            },
          },
        },
      },
    ]);

    return {
      totalOffers,
      draftOffers,
      sentOffers,
      acceptedOffers,
      rejectedOffers,
      totalOfferValue: totalValue[0]?.totalFinalPrice || 0,
    };
  }),
});
