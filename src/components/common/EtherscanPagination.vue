<template>
  <nav aria-label="Pagination" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-sm text-text-secondary dark:text-gray-400">
      Showing {{ startRecord }} to {{ endRecord }} of {{ total }} records
    </div>
    <div class="flex items-center gap-1">
      <!-- First -->
      <button class="btn-page" :disabled="page <= 1" aria-label="First page" @click="goTo(1)">First</button>
      <!-- Prev -->
      <button class="btn-page" :disabled="page <= 1" aria-label="Previous page" @click="goTo(page - 1)">&lt;</button>

      <!-- Page numbers -->
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="px-1 text-xs text-gray-400 dark:text-gray-500">...</span>
        <button
          v-else
          class="btn-page"
          :class="
            p === page ? 'bg-primary-500 text-white border-primary-500 dark:bg-primary-600 dark:border-primary-600' : ''
          "
          :aria-current="p === page ? 'page' : undefined"
          @click="goTo(p)"
        >
          {{ p }}
        </button>
      </template>

      <!-- Next -->
      <button class="btn-page" :disabled="page >= totalPages" aria-label="Next page" @click="goTo(page + 1)">
        &gt;
      </button>
      <!-- Last -->
      <button class="btn-page" :disabled="page >= totalPages" aria-label="Last page" @click="goTo(totalPages)">
        Last
      </button>

      <!-- Page size dropdown -->
      <select
        v-if="showPageSize"
        :value="pageSize"
        aria-label="Results per page"
        class="ml-2 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        @change="onPageSizeChange"
      >
        <option v-for="s in pageSizes" :key="s" :value="s">{{ s }} / page</option>
      </select>
    </div>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { PAGE_SIZE_OPTIONS } from "@/constants";

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageSize: { type: Number, default: 25 },
  total: { type: Number, default: 0 },
  showPageSize: { type: Boolean, default: true },
});

const emit = defineEmits(["update:page", "update:pageSize"]);

const pageSizes = PAGE_SIZE_OPTIONS;

const startRecord = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1));

const endRecord = computed(() => Math.min(props.page * props.pageSize, props.total));

/**
 * Build a compact page number array with ellipsis.
 * Shows at most 7 slots: [1, ..., p-1, p, p+1, ..., last]
 */
const visiblePages = computed(() => {
  const total = props.totalPages;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const current = props.page;
  const pages = [];

  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
});

function goTo(p) {
  if (p >= 1 && p <= props.totalPages) {
    emit("update:page", p);
  }
}

function onPageSizeChange(e) {
  emit("update:pageSize", Number(e.target.value));
}
</script>

<style scoped>
.btn-page {
  @apply rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600
         transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
         dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700
         dark:focus-visible:ring-offset-gray-900;
}
</style>
