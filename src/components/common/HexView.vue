<template>
  <div class="hex-view font-mono text-xs">
    {{ hex }}
  </div>
</template>

<script>
export default {
  name: 'HexView',
  props: { data: String }
}
</script>

<style scoped>
.hex-view {
  @apply p-3 bg-gray-100 rounded break-all;
}
</style>
