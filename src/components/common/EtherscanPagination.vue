<template>
  <nav aria-label="Pagination" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-sm text-text-secondary">Showing {{ startRecord }} to {{ endRecord }} of {{ total }} records</div>
    <div class="flex items-center gap-1">
      <button class="btn-page" :disabled="page <= 1" aria-label="First page" @click="goTo(1)">First</button>
      <button class="btn-page" :disabled="page <= 1" aria-label="Previous page" @click="goTo(page - 1)">&lt;</button>
      <span class="mx-2 text-sm text-gray-600 dark:text-gray-400">
        Page <strong>{{ page }}</strong> of <strong>{{ totalPages }}</strong>
      </span>
      <button class="btn-page" :disabled="page >= totalPages" aria-label="Next page" @click="goTo(page + 1)">
        &gt;
      </button>
      <button class="btn-page" :disabled="page >= totalPages" aria-label="Last page" @click="goTo(totalPages)">
        Last
      </button>
      <select
        v-if="showPageSize"
        :value="pageSize"
        aria-label="Results per page"
        class="ml-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        @change="$emit('update:pageSize', Number($event.target.value))"
      >
        <option v-for="s in pageSizes" :key="s" :value="s">{{ s }} / page</option>
      </select>
    </div>
  </nav>
</template>

<script>
export default {
  name: "EtherscanPagination",
  props: {
    page: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    pageSize: { type: Number, default: 25 },
    total: { type: Number, default: 0 },
    showPageSize: { type: Boolean, default: true },
  },
  emits: ["update:page", "update:pageSize"],
  computed: {
    pageSizes() {
      return [10, 25, 50, 100];
    },
    startRecord() {
      return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
    },
    endRecord() {
      return Math.min(this.page * this.pageSize, this.total);
    },
  },
  methods: {
    goTo(p) {
      if (p >= 1 && p <= this.totalPages) {
        this.$emit("update:page", p);
      }
    },
  },
};
</script>

<style scoped>
.btn-page {
  @apply rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600
         transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40
         dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700;
}
</style>
