import { initTRPC, TRPCError } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../shared/types';
import { JwtPayloadSchema } from '../../shared/schemas/user';

export interface Context {
  user: JwtPayload | null;
  accessToken?: string;
}

export function createInnerTRPCContext(partial: Partial<Context> = {}): Context {
  return {
    user: null,
    ...partial,
  };
}

export function createContext({ req }: trpcExpress.CreateExpressContextOptions): Context {
  // Try to get token from Authorization header first (for backwards compatibility)
  let token: string | undefined;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else {
    // Fall back to reading from HttpOnly cookie
    token = (req.cookies as Record<string, string>)?.auth_token;
  }

  if (!token) return { user: null };

  try {
    const verifiedPayload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    const payload = JwtPayloadSchema.parse(verifiedPayload);

    // Extract access token from cookies or Authorization header
    const accessToken = (req.cookies as Record<string, string>)?.access_token ||
                       req.headers.authorization?.replace('Bearer ', '');

    return { user: payload, accessToken };
  } catch {
    return { user: null };
  }
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
