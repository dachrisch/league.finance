import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { Association } from '../../models/Association';

export const associationsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        email: z.string().email(),
        phone: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.create(input);
      return association;
    }),

  list: protectedProcedure.query(async () => {
    const associations = await Association.find().sort({ name: 1 });
    return associations;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const association = await Association.findById(input.id);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return association;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.findByIdAndUpdate(input.id, input.data, { new: true });
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return association;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const association = await Association.findByIdAndDelete(input.id);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return { success: true };
    }),
});
