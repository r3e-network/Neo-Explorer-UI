<template>
  <button
    @click="copyText"
    class="relative inline-flex items-center justify-center rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    :class="sizeClass"
    :title="copied ? 'Copied!' : copyFailed ? 'Copy failed' : 'Copy'"
    :aria-label="copied ? 'Copied to clipboard' : copyFailed ? 'Copy to clipboard failed' : 'Copy to clipboard'"
  >
    <!-- Copy icon -->
    <svg v-if="!copied && !copyFailed" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
    <!-- Check icon -->
    <svg v-else-if="copied" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    <!-- Fail icon -->
    <svg v-else :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>

    <!-- Tooltip -->
    <transition name="tooltip">
      <span
        v-if="copied"
        class="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow dark:bg-gray-600"
      >
        Copied!
      </span>
      <span
        v-else-if="copyFailed"
        class="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white shadow"
      >
        Failed!
      </span>
    </transition>
  </button>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/constants";

const props = defineProps({
  text: { type: String, default: "" },
  size: {
    type: String,
    default: "sm",
    validator: (v) => ["sm", "md"].includes(v),
  },
});

const copied = ref(false);
const copyFailed = ref(false);
let feedbackTimer = null;

const sizeClass = computed(() => (props.size === "md" ? "p-1.5" : "p-1"));

const iconClass = computed(() => [
  props.size === "md" ? "w-5 h-5" : "w-3.5 h-3.5",
  copied.value
    ? "text-green-500 dark:text-green-400"
    : copyFailed.value
    ? "text-red-500 dark:text-red-400"
    : "text-gray-400 dark:text-gray-500",
  "transition-colors",
]);

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyText() {
  if (!props.text) return;
  if (feedbackTimer) clearTimeout(feedbackTimer);
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(props.text);
    } else if (!fallbackCopy(props.text)) {
      throw new Error("Fallback copy failed");
    }
    copied.value = true;
    feedbackTimer = setTimeout(() => {
      copied.value = false;
    }, COPY_FEEDBACK_TIMEOUT_MS);
  } catch (e) {
    if (import.meta.env.DEV) console.error("Copy failed:", e);
    copyFailed.value = true;
    feedbackTimer = setTimeout(() => {
      copyFailed.value = false;
    }, COPY_FEEDBACK_TIMEOUT_MS);
  }
}

onBeforeUnmount(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer);
});
</script>

<style scoped>
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}
</style>
