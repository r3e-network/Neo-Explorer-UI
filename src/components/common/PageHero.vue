<template>
  <div class="detail-hero detail-hero-circuit detail-hero-enhanced">
    <!-- Circuit particles -->
    <span v-if="particles !== 0" class="circuit-particle"></span>
    <span v-if="particles > 1" class="circuit-particle"></span>
    <span v-if="particles > 2" class="circuit-particle"></span>
    <span v-if="particles > 3" class="circuit-particle"></span>
    <span v-if="particles > 4" class="circuit-particle"></span>

    <slot />
  </div>
</template>

<script setup>
defineProps({
  /** Number of circuit particles (0-5), default 3 */
  particles: { type: Number, default: 3 },
});
</script>
