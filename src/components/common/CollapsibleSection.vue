<template>
  <div class="rounded-lg border border-card-border dark:border-card-border-dark">
    <button
      class="flex w-full items-center justify-between p-4 text-left"
      aria-label="Toggle section"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">
        {{ title }}
        <slot name="title-suffix" />
      </h3>
      <svg
        class="h-4 w-4 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-if="isOpen" class="border-t border-card-border dark:border-card-border-dark">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  defaultOpen: { type: Boolean, default: false },
});

const isOpen = ref(props.defaultOpen);
</script>
