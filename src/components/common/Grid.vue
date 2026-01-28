<template>
  <div class="grid-container" :class="cols">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'Grid',
  props: { cols: { type: String, default: 'cols-2' } }
}
</script>

<style scoped>
.grid-container { @apply grid gap-4; }
.cols-2 { @apply grid-cols-1 md:grid-cols-2; }
.cols-3 { @apply grid-cols-1 md:grid-cols-3; }
.cols-4 { @apply grid-cols-2 md:grid-cols-4; }
</style>
