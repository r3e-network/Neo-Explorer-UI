<template>
  <div class="skeleton" :style="{ width, height }"></div>
</template>

<script>
export default {
  name: 'Skeleton',
  props: {
    width: { type: String, default: '100%' },
    height: { type: String, default: '20px' }
  }
}
</script>

<style scoped>
.skeleton {
  @apply bg-gray-200 rounded animate-pulse;
}
.dark .skeleton {
  @apply bg-gray-700;
}
</style>
