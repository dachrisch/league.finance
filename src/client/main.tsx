import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { trpc, createTrpcClient } from './lib/trpc';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Handle global 401s (UNAUTHORIZED)
      // Token is in HttpOnly cookie, so the server will handle clearing it on logout
      if ((error as any)?.data?.code === 'UNAUTHORIZED') {
        window.location.href = '/login';
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    }
  },
});
const trpcClient = createTrpcClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
