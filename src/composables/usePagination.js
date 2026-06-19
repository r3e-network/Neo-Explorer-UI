import { ref, computed, watch, onBeforeUnmount, getCurrentInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { getCache } from "@/services/cache";
import { fetchFreshQuery } from "@/query/freshness";
import { isAbortError } from "@/utils/abortError";

const DEFAULT_PAGE_TIMEOUT_MS = 8000;

function createTimeoutError(timeoutMs) {
  const error = new Error(`Pagination request timed out after ${timeoutMs}ms`);
  error.name = "TimeoutError";
  return error;
}

async function withPaginationTimeout(promise, timeoutMs) {
  const effectiveTimeout = Number(timeoutMs);
  if (!Number.isFinite(effectiveTimeout) || effectiveTimeout <= 0) {
    return promise;
  }

  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(createTimeoutError(effectiveTimeout)), effectiveTimeout);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Composition API composable for paginated data fetching.
 *
 * @param {(pageSize: number, skip: number, options?: object) => Promise<{result: Array, totalCount: number}>} fetchFn
 *   Async function that accepts (pageSize, skip) and returns { result, totalCount }.
 * @param {object} [options]
 * @param {number}  [options.defaultPageSize]  - Initial page size (default: DEFAULT_PAGE_SIZE).
 * @param {object}  [options.routeSync]        - Enable route-driven pagination.
 * @param {string}  [options.routeSync.basePath]  - URL prefix, e.g. "/blocks". Page is appended as "/:page".
 * @param {string}  [options.routeSync.pageParam] - Route param name (default: "page").
 * @param {(pageSize: number, skip: number) => string} [options.cacheKeyFn]
 *   Returns a cache key; when the key hits, loading skeleton is suppressed.
 * @param {(pageSize: number, skip: number, context?: object) => Array|string} [options.queryKeyFn]
 *   Returns a TanStack Query key; when present, page loads route through the shared query layer.
 * @param {string} [options.querySource] - Source label stored in freshness snapshots.
 * @param {number} [options.queryStaleTime] - TanStack Query staleTime for warm page reads.
 * @param {number} [options.timeoutMs] - Max time before a page request releases loading.
 * @returns Reactive pagination state and control functions.
 */
export function usePagination(
  fetchFn,
  {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    routeSync = null,
    cacheKeyFn = null,
    errorMessage = null,
    queryKeyFn = null,
    querySource = "pagination",
    queryStaleTime = 3_000,
    timeoutMs = DEFAULT_PAGE_TIMEOUT_MS,
  } = {}
) {
  const { t } = useI18n();
  const router = useRouter();
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const totalCount = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(defaultPageSize);

  const totalPages = computed(() => (totalCount.value === 0 ? 1 : Math.ceil(totalCount.value / pageSize.value)));
  const startRecord = computed(() => (totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1));
  const endRecord = computed(() => Math.max(startRecord.value - 1, Math.min(currentPage.value * pageSize.value, totalCount.value)));

  // Race-condition guard: only the latest request writes state.
  let requestId = 0;
  // Counter of in-flight non-silent (loading-skeleton-showing) fetches.
  // Loading state must clear when the LAST one finishes — gating it on
  // the latest requestId previously caused stuck-skeleton bugs when an
  // auto-refresh tick fired before the initial fetch resolved (the
  // initial fetch's finally clause saw a stale myId and skipped the
  // loading.value = false reset, leaving the page on skeletons forever).
  let pendingLoadingFetches = 0;

  /**
   * Load a specific page.
   * @param {number} page
   * @param {{ silent?: boolean, forceRefresh?: boolean }} [fetchOptions]
   */
  async function loadPage(page, { silent = false, forceRefresh = false } = {}) {
    if (typeof page !== "number" || page < 1) page = 1;
    const myId = ++requestId;
    const skip = (page - 1) * pageSize.value;

    // Cache-aware loading: suppress skeleton when cached data exists
    let shouldShowLoading = !silent;
    if (shouldShowLoading && cacheKeyFn) {
      const key = cacheKeyFn(pageSize.value, skip);
      if (getCache(key) !== null) shouldShowLoading = false;
    }

    if (shouldShowLoading) {
      pendingLoadingFetches += 1;
      loading.value = true;
    }
    if (!silent) error.value = null;

    try {
      const res = await withPaginationTimeout(
        Promise.resolve().then(() => {
          if (!queryKeyFn) {
            return fetchFn(pageSize.value, skip, { forceRefresh });
          }
          const queryKey = queryKeyFn(pageSize.value, skip, { forceRefresh, page });
          return fetchFreshQuery({
            forceRefresh,
            queryKey,
            queryFn: ({ forceRefresh: queryForceRefresh }) =>
              fetchFn(pageSize.value, skip, { forceRefresh: queryForceRefresh }),
            source: querySource,
            staleTime: queryStaleTime,
          });
        }),
        timeoutMs,
      );
      if (myId !== requestId) return; // stale response
      totalCount.value = res?.totalCount || 0;
      items.value = res?.result || [];
      // Clamp to the new last page if totalCount drifted down between
      // refreshes (e.g. empty-block pruning, deleted records). Without
      // this the UI could read "Showing 41-30 of 30" and the Next button
      // would freeze because currentPage > totalPages.
      const lastPage = Math.max(1, Math.ceil((res?.totalCount || 0) / pageSize.value));
      currentPage.value = Math.min(page, lastPage);
    } catch (err) {
      if (myId !== requestId) return;
      // Aborted requests (component unmount, route change, dependency
      // re-fetch via AbortController) aren't user-visible failures — they're
      // intentional cancellations. Surfacing them as "Failed to load" caused
      // a flash of error UI on routes that re-fetch on watch tick.
      if (isAbortError(err)) return;
      if (import.meta.env.DEV) console.error("Failed to load page:", err);
      if (!silent || items.value.length === 0) {
        error.value = typeof errorMessage === "function" ? errorMessage(err) : errorMessage || t("errors.generic");
        items.value = [];
      }
    } finally {
      if (shouldShowLoading) {
        pendingLoadingFetches = Math.max(0, pendingLoadingFetches - 1);
        if (pendingLoadingFetches === 0) loading.value = false;
      }
    }
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages.value) return;
    if (routeSync) {
      router.push(`${routeSync.basePath}/${page}`).catch(() => {});
    } else {
      loadPage(page);
    }
  }

  function changePageSize(size) {
    pageSize.value = size;
    if (routeSync) {
      router.push(`${routeSync.basePath}/1`).catch(() => {});
    } else {
      loadPage(1);
    }
  }

  // Route sync: watch route param and trigger loadPage
  let stopRouteWatch = null;
  if (routeSync) {
    const route = useRoute();
    const paramName = routeSync.pageParam || "page";
    stopRouteWatch = watch(
      () => route.params[paramName],
      (page) => {
        const parsed = Math.max(1, parseInt(page, 10) || 1);
        currentPage.value = parsed;
        loadPage(parsed);
      },
      { immediate: true }
    );
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (stopRouteWatch) stopRouteWatch();
    });
  }

  return {
    items,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    startRecord,
    endRecord,
    loadPage,
    goToPage,
    changePageSize,
  };
}
