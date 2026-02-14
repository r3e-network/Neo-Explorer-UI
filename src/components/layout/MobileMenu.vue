<template>
  <!-- Mobile Hamburger -->
  <button
    class="ml-3 rounded p-2 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:hidden"
    @click="$emit('toggle')"
    aria-label="Toggle menu"
  >
    <svg v-if="!open" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
});

defineEmits(["toggle"]);
</script>
