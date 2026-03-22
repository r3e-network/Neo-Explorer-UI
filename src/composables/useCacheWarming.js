import { ref, onBeforeUnmount, getCurrentInstance } from "vue";
import { blockService, statsService } from "@/services";

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
      await Promise.allSettled([blockService.getList(1, 0), blockService.getCount(), statsService.getDashboardStats()]);

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
