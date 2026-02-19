import { ref, computed, watch, onBeforeUnmount, getCurrentInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { getCache } from "@/services/cache";

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
 * @returns Reactive pagination state and control functions.
 */
export function usePagination(
  fetchFn,
  { defaultPageSize = DEFAULT_PAGE_SIZE, routeSync = null, cacheKeyFn = null, errorMessage = null } = {}
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
  const endRecord = computed(() => Math.min(currentPage.value * pageSize.value, totalCount.value));

  // Race-condition guard: only the latest request writes state.
  let requestId = 0;

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

    if (shouldShowLoading) loading.value = true;
    if (!silent) error.value = null;

    try {
      const res = await fetchFn(pageSize.value, skip, { forceRefresh });
      if (myId !== requestId) return; // stale response
      totalCount.value = res?.totalCount || 0;
      items.value = res?.result || [];
      currentPage.value = page;
    } catch (err) {
      if (myId !== requestId) return;
      if (import.meta.env.DEV) console.error("Failed to load page:", err);
      if (!silent || items.value.length === 0) {
        error.value = errorMessage || t("errors.generic");
        items.value = [];
      }
    } finally {
      if (myId === requestId && shouldShowLoading) loading.value = false;
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
        const parsed = Math.max(1, parseInt(page) || 1);
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
