import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateContactSchema, UpdateContactSchema } from '../../../../shared/schemas/contact';
import { Contact } from '../../models/Contact';

export const contactsRouter = router({
  list: protectedProcedure.query(async () => {
    return Contact.find().sort({ name: 1 }).lean();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const contact = await Contact.findById(input.id).lean();
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      return contact;
    }),

  create: adminProcedure
    .input(CreateContactSchema)
    .mutation(async ({ input }) => {
      const contact = await Contact.create(input);
      return contact.toObject();
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateContactSchema }))
    .mutation(async ({ input }) => {
      const contact = await Contact.findByIdAndUpdate(input.id, input.data, {
        new: true,
      }).lean();
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      return contact;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const contact = await Contact.findByIdAndDelete(input.id);
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      return { success: true };
    }),
});
