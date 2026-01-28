<template>
  <div class="pagination">
    <button :disabled="page <= 1" @click="$emit('change', page - 1)">
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
    <span class="page-info">{{ page }} / {{ total }}</span>
    <button :disabled="page >= total" @click="$emit('change', page + 1)">
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  name: "Pagination",
  props: { page: Number, total: Number },
  emits: ["change"],
};
</script>

<style scoped>
.pagination {
  @apply flex items-center gap-4;
}
.pagination button {
  @apply p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50;
}
.page-info {
  @apply text-sm text-gray-500;
}
</style>
