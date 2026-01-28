<template>
  <button
    @click="copyText"
    class="copy-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    :title="copied ? 'Copied!' : 'Copy'"
  >
    <svg
      v-if="!copied"
      class="w-4 h-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
    <svg
      v-else
      class="w-4 h-4 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 13l4 4L19 7"
      />
    </svg>
  </button>
</template>

<script>
export default {
  name: "CopyButton",
  props: { text: String },
  data() {
    return { copied: false };
  },
  methods: {
    async copyText() {
      if (!this.text) return;
      try {
        await navigator.clipboard.writeText(this.text);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (e) {
        console.error("Copy failed:", e);
      }
    },
  },
};
</script>
