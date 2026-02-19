<template>
  <div class="trace-section">
    <button
      class="list-row flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
      aria-label="Toggle trace section"
      :aria-expanded="open"
      @click="open = !open"
    >
      <div class="flex items-center gap-2">
        <svg
          class="text-low h-4 w-4 transition-transform"
          :class="{ 'rotate-90': open }"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-high text-sm font-semibold">
          {{ title }}
        </span>
        <span
          v-if="count != null"
          class="badge-soft rounded-full px-1.5 py-0.5"
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
