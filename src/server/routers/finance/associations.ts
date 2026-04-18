import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../../trpc';
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
        address: z.object({
          street: z.string(),
          city: z.string(),
          postalCode: z.string(),
          country: z.string(),
        }),
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
          address: z.object({
            street: z.string(),
            city: z.string(),
            postalCode: z.string(),
            country: z.string(),
          }).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' });
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

  search: publicProcedure
    .input(z.object({
      name: z.string(),
    }))
    .query(async ({ input }) => {
      // Exact name match
      const association = await Association.findOne({
        name: { $regex: `^${input.name}$`, $options: 'i' },
      });

      if (association) {
        return {
          _id: association._id.toString(),
          name: association.name,
        };
      }

      return null;
    }),
});
