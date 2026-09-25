import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      gcTime: 1000 * 60 * 60 * 24, // 24 hours cache retention
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: 'ERB_OFFLINE_CACHE',
});

persistQueryClient({
  queryClient,
  persister: idbPersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours max cache age
  buster: 'v1.0.0',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Persist essential reference data (parties & products) to IndexedDB
      const key = query.queryKey[0];
      return key === 'parties' || key === 'products';
    },
  },
});

export default queryClient;

