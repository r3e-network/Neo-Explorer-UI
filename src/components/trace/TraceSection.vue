<template>
  <div class="trace-section">
    <button
      class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      aria-label="Toggle trace section"
      :aria-expanded="open"
      @click="open = !open"
    >
      <div class="flex items-center gap-2">
        <svg
          class="w-4 h-4 text-gray-400 transition-transform"
          :class="{ 'rotate-90': open }"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {{ title }}
        </span>
        <span
          v-if="count != null"
          class="px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        >
          {{ count }}
        </span>
      </div>
    </button>
    <div v-if="open" class="px-4 pb-4">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: null },
  defaultOpen: { type: Boolean, default: false },
});

const open = ref(props.defaultOpen);
</script>
