import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../../trpc';
import { AddDiscountSchema } from '../../../../shared/schemas/discount';
import { Discount } from '../../models/Discount';
import { FinancialConfig } from '../../models/FinancialConfig';

export const discountsRouter = router({
  add: adminProcedure
    .input(AddDiscountSchema)
    .mutation(async ({ input }) => {
      const config = await FinancialConfig.findById(input.configId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Config not found' });
      const discount = await Discount.create(input);
      return discount.toObject();
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await Discount.findByIdAndDelete(input.id);
      return { success: true };
    }),
});
