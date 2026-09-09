import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes stale time
      gcTime: 1000 * 60 * 10,   // 10 minutes cache retention
      refetchOnWindowFocus: true, // Auto-sync on switching browser tabs or windows
      retry: 1,
    },
  },
});

export default queryClient;
