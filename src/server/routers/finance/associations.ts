import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { Association } from '../../models/Association';

const normalizeAssociation = (doc: any) => ({
  ...doc.toObject?.() || doc,
  _id: doc._id.toString(),
});

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
      return normalizeAssociation(association);
    }),

  list: protectedProcedure.query(async () => {
    const associations = await Association.find().sort({ name: 1 });
    return associations.map(normalizeAssociation);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const association = await Association.findById(input.id);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return normalizeAssociation(association);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const association = await Association.findById(input.id);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return normalizeAssociation(association);
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
      return normalizeAssociation(association);
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
