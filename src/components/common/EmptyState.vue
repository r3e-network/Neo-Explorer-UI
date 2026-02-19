<template>
  <div class="py-12 px-4 text-center">
    <div
      v-once
      class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-card-border/70 bg-white/70 text-text-secondary shadow-card dark:border-card-border-dark/70 dark:bg-gray-800/70 dark:text-gray-400"
    >
      <!-- Block icon -->
      <svg
        v-if="icon === 'block'"
        aria-hidden="true"
        class="h-8 w-8 text-gray-400 dark:text-gray-500"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      </svg>
      <!-- Transaction icon -->
      <svg
        v-else-if="icon === 'tx'"
        aria-hidden="true"
        class="h-8 w-8 text-gray-400 dark:text-gray-500"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"
        />
      </svg>
      <!-- Token icon -->
      <svg
        v-else-if="icon === 'token'"
        aria-hidden="true"
        class="h-8 w-8 text-gray-400 dark:text-gray-500"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <!-- Contract icon -->
      <svg
        v-else-if="icon === 'contract'"
        aria-hidden="true"
        class="h-8 w-8 text-gray-400 dark:text-gray-500"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17h8v-2H8v2zm0-4h8v-2H8v2z"
        />
      </svg>
      <!-- Search icon -->
      <svg
        v-else-if="icon === 'search'"
        aria-hidden="true"
        class="h-8 w-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <!-- Default inbox icon -->
      <svg
        v-else
        aria-hidden="true"
        class="h-8 w-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    </div>

    <p class="font-semibold text-text-secondary dark:text-gray-300">{{ message }}</p>

    <router-link
      v-if="actionLabel && actionTo"
      :to="actionTo"
      class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
    >
      {{ actionLabel }}
    </router-link>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: "No data available" },
  icon: {
    type: String,
    default: "default",
    validator: (v) => ["block", "tx", "token", "contract", "search", "default"].includes(v),
  },
  actionLabel: { type: String, default: "" },
  actionTo: { type: [String, Object], default: "" },
});
</script>
