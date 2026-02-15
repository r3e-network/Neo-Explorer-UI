import { ref, onBeforeUnmount, getCurrentInstance } from "vue";
import { blockService, statsService, tokenService } from "@/services";

const isWarmedUp = ref(false);
const prefetchQueue = ref(new Set());

export function useCacheWarming() {
  let prefetchTimeout = null;

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (prefetchTimeout) {
        clearTimeout(prefetchTimeout);
        prefetchTimeout = null;
      }
    });
  }

  const warmCriticalCache = async () => {
    if (isWarmedUp.value) return;

    try {
      await Promise.allSettled([
        blockService.getList(1, 0),
        blockService.getCount(),
        statsService.getDashboardStats(),
        tokenService.getTokenList("NEP17", 50, 0),
      ]);

      isWarmedUp.value = true;

      if (import.meta.env.DEV) {
        console.log("[Cache] Critical data warmed up");
      }
    } catch (err) {
      if (import.meta.env.DEV) {
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
  const prefetchedUrls = new Set();

  const prefetchOnHover = (el, fetchFn) => {
    if (!el || !(el instanceof HTMLElement)) return;
    const url = el.getAttribute("href") || el.dataset.prefetchUrl || "";
    if (prefetchedUrls.has(url)) return;

    const handler = () => {
      prefetchedUrls.add(url);
      el.removeEventListener("mouseenter", handler);
      fetchFn();
    };

    el.addEventListener("mouseenter", handler, { once: true });
  };

  const cleanup = () => {
    prefetchedUrls.clear();
  };

  return { prefetchOnHover, cleanup };
}

export function useInfiniteScroll(fetchFn, options = {}) {
  const { threshold = 200, debounceMs = 100 } = options;
  const isLoadingMore = ref(false);
  let debounceTimer = null;

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    });
  }

  const handleScroll = (container, currentPage, hasMore) => {
    if (isLoadingMore.value || !hasMore) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const scrollTop = container.scrollTop || window.scrollY;
      const scrollHeight = container.scrollHeight || document.documentElement.scrollHeight;
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
