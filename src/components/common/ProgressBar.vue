<template>
  <div class="progress-bar">
    <div class="fill" :style="{ width: `${percent}%` }"></div>
  </div>
</template>

<script>
export default {
  name: 'ProgressBar',
  props: { percent: { type: Number, default: 0 } }
}
</script>

<style scoped>
.progress-bar {
  @apply h-2 bg-gray-200 rounded-full overflow-hidden;
}
.fill {
  @apply h-full bg-primary-500 transition-all;
}
</style>
