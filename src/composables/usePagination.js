import { DEFAULT_PAGE_SIZE } from "@/constants";

/**
 * Creates a pagination mixin for Options API list pages.
 *
 * @param {string} routeBase - Base route path for navigation (e.g. "/blocks").
 *   For dynamic routes, override `goToPage` / `changePageSize` in the component.
 * @returns {Object} Vue mixin object
 *
 * The consuming component MUST implement a `loadPage()` method that:
 *   1. Uses `this.currentPage` and `this.pageSize` to fetch data.
 *   2. Calls `this.applyPage(totalCount, items)` with the response.
 */
export function createPaginationMixin(routeBase) {
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

    watch: {
      "$route.params.page": {
        immediate: true,
        handler(page) {
          const parsed = parseInt(page) || 1;
          this.currentPage = Math.max(1, parsed);
          this.loadPage();
        },
      },
    },

    methods: {
      /**
       * Call after fetching a page to update pagination state.
       * @param {number} totalCount - Total number of records
       * @param {Array}  [items]    - Optional items array (for convenience)
       * @returns {Array} The items array passed in (pass-through)
       */
      applyPage(totalCount, items) {
        this.total = totalCount || 0;
        this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
        return items;
      },

      goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
          this.$router.push(`${routeBase}/${page}`);
        }
      },

      changePageSize(size) {
        this.pageSize = size;
        this.$router.push(`${routeBase}/1`);
      },
    },
  };
}
