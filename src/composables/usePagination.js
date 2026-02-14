import { ref, computed } from "vue";
import { DEFAULT_PAGE_SIZE } from "@/constants";

/**
 * Composition API composable for paginated data fetching.
 *
 * @param {(pageSize: number, skip: number) => Promise<{result: Array, totalCount: number}>} fetchFn
 *   Async function that accepts (pageSize, skip) and returns { result, totalCount }.
 * @param {{ defaultPageSize?: number }} options
 * @returns Reactive pagination state and control functions.
 */
export function usePagination(fetchFn, { defaultPageSize = DEFAULT_PAGE_SIZE } = {}) {
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

  async function loadPage(page) {
    const myId = ++requestId;
    loading.value = true;
    error.value = null;
    try {
      const skip = (page - 1) * pageSize.value;
      const res = await fetchFn(pageSize.value, skip);
      if (myId !== requestId) return; // stale response
      totalCount.value = res?.totalCount || 0;
      items.value = res?.result || [];
      currentPage.value = page;
    } catch (err) {
      if (myId !== requestId) return;
      if (import.meta.env.DEV) console.error("Failed to load page:", err);
      error.value = "Failed to load data. Please try again.";
      items.value = [];
    } finally {
      if (myId === requestId) loading.value = false;
    }
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value) loadPage(page);
  }

  function changePageSize(size) {
    pageSize.value = size;
    loadPage(1);
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

/**
 * Legacy Options API pagination mixin kept for test/backward compatibility.
 * @param {string} basePath
 * @returns {object}
 */
export function createPaginationMixin(basePath) {
  return {
    data() {
      return {
        currentPage: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 1,
      };
    },
    computed: {
      paginationOffset() {
        return (this.currentPage - 1) * this.pageSize;
      },
    },
    watch: {},
    methods: {
      applyPage(totalCount, items) {
        this.total = Number(totalCount) || 0;
        this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
        return Array.isArray(items) ? items : [];
      },
      goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
          this.$router.push(`${basePath}/${page}`).catch(() => {});
        }
      },
      changePageSize(size) {
        this.pageSize = size;
        this.$router.push(`${basePath}/1`).catch(() => {});
      },
    },
  };
}
