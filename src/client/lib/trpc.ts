import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/routers/index';

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        fetch: async (url, options) => {
          return fetch(url, {
            ...options,
            credentials: 'include', // Send cookies with every request
          });
        },
      }),
    ],
  });
}
