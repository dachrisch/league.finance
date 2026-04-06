import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateFinancialConfigSchema, UpdateFinancialConfigSchema } from '../../../../shared/schemas/financialConfig';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';

export const configsRouter = router({
  list: protectedProcedure.query(async () => {
    return FinancialConfig.find().sort({ createdAt: -1 }).lean();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const config = await FinancialConfig.findById(input.id).lean();
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });
      const discounts = await Discount.find({ configId: input.id }).lean();
      return { config, discounts };
    }),

  create: adminProcedure
    .input(CreateFinancialConfigSchema)
    .mutation(async ({ input }) => {
      try {
        const config = await FinancialConfig.create(input);
        return config.toObject();
      } catch (err: any) {
        if (err.code === 11000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A config for this league/season already exists.',
          });
        }
        throw err;
      }
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateFinancialConfigSchema }))
    .mutation(async ({ input }) => {
      const config = await FinancialConfig.findByIdAndUpdate(input.id, input.data, { new: true }).lean();
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });
      return config;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await Discount.deleteMany({ configId: input.id });
      await FinancialConfig.findByIdAndDelete(input.id);
      return { success: true };
    }),
});
