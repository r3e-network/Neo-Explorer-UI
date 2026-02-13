import { ref } from "vue";
import { blockService, statsService, tokenService } from "@/services";
import { getCurrentEnv } from "@/utils/env";

const isWarmedUp = ref(false);
const prefetchQueue = ref(new Set());
let prefetchTimeout = null;

export function useCacheWarming() {
  const warmCriticalCache = async () => {
    if (isWarmedUp.value) return;

    const env = getCurrentEnv();

    try {
      await Promise.allSettled([
        blockService.getLatestBlock(),
        blockService.getCount(),
        statsService.getDashboardStats(),
        tokenService.getList(50, 0, { network: env }),
      ]);

      isWarmedUp.value = true;

      if (process.env.NODE_ENV !== "production") {
        console.log("[Cache] Critical data warmed up");
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Cache] Warming failed:", err);
      }
    }
  };

  const prefetch = async (key, fetcher, priority = "low") => {
    if (prefetchQueue.value.has(key)) return;

    prefetchQueue.value.add(key);

    if (priority === "high") {
      try {
        await fetcher();
      } finally {
        prefetchQueue.value.delete(key);
      }
    } else {
      clearTimeout(prefetchTimeout);
      prefetchTimeout = setTimeout(async () => {
        try {
          await fetcher();
        } finally {
          prefetchQueue.value.delete(key);
        }
      }, 100);
    }
  };

  const prefetchNextPage = async (currentPage, totalPages, fetchFn) => {
    if (currentPage >= totalPages - 1) return;

    const nextPage = currentPage + 1;
    const key = `page_${nextPage}`;

    await prefetch(key, () => fetchFn(nextPage), "low");
  };

  return {
    warmCriticalCache,
    prefetch,
    prefetchNextPage,
    isWarmedUp: isWarmedUp,
  };
}

export function usePrefetchOnHover() {
  const prefetchOnHover = (url, fetchFn) => {
    const link = document.createElement("a");
    link.href = url;
    link.addEventListener(
      "mouseenter",
      () => {
        fetchFn();
      },
      { once: true }
    );
  };

  return { prefetchOnHover };
}

export function useInfiniteScroll(fetchFn, options = {}) {
  const { threshold = 200, debounceMs = 100 } = options;
  const isLoadingMore = ref(false);
  let debounceTimer = null;

  const handleScroll = (container, currentPage, hasMore) => {
    if (isLoadingMore.value || !hasMore) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const scrollTop = container.scrollTop || window.scrollY;
      const scrollHeight =
        container.scrollHeight || document.documentElement.scrollHeight;
      const clientHeight = container.clientHeight || window.innerHeight;

      if (scrollHeight - scrollTop - clientHeight < threshold) {
        isLoadingMore.value = true;
        fetchFn(currentPage + 1).finally(() => {
          isLoadingMore.value = false;
        });
      }
    }, debounceMs);
  };

  return {
    handleScroll,
    isLoadingMore,
  };
}
