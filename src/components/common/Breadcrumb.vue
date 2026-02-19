<template>
  <nav aria-label="Breadcrumb" class="mb-4">
    <ol class="surface-panel inline-flex flex-wrap items-center gap-1 px-2 py-1 text-sm">
      <li v-for="(item, index) in items" :key="index" class="flex items-center">
        <!-- Separator -->
        <svg
          v-if="index > 0"
          class="text-low mx-1.5 h-3.5 w-3.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>

        <!-- Last item: current page (no link) -->
        <span
          v-if="index === items.length - 1"
          class="text-high font-semibold"
          aria-current="page"
        >
          {{ item.label }}
        </span>

        <!-- Clickable items -->
        <router-link
          v-else
          :to="item.to"
          class="crumb-link text-mid rounded px-1.5 py-0.5 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {{ item.label }}
        </router-link>
      </li>
    </ol>
  </nav>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
    validator: (value) => value.every((item) => typeof item.label === "string"),
  },
});
</script>

<style scoped>
.crumb-link:hover {
  background: var(--surface-hover);
}
</style>
