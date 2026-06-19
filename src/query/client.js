import { QueryClient } from "@tanstack/vue-query";

export const explorerQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 3_000,
    },
  },
});
