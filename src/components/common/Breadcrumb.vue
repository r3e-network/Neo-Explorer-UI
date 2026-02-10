<template>
  <nav aria-label="Breadcrumb" class="breadcrumb mb-4">
    <ol class="flex items-center flex-wrap gap-1 text-sm">
      <li v-for="(item, index) in items" :key="index" class="flex items-center">
        <!-- Separator -->
        <svg
          v-if="index > 0"
          class="mx-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>

        <!-- Last item: plain text (current page) -->
        <span
          v-if="index === items.length - 1"
          class="font-medium text-gray-800 dark:text-gray-200"
          aria-current="page"
        >
          {{ item.label }}
        </span>

        <!-- Clickable items -->
        <router-link
          v-else
          :to="item.to"
          class="text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
        >
          {{ item.label }}
        </router-link>
      </li>
    </ol>
  </nav>
</template>

<script>
export default {
  name: "BreadcrumbNav",
  props: {
    items: {
      type: Array,
      required: true,
      validator(value) {
        return value.every((item) => typeof item.label === "string");
      },
    },
  },
};
</script>
