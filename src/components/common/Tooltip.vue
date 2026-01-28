<template>
  <div class="tooltip-wrapper">
    <slot></slot>
    <div class="tooltip-content">{{ text }}</div>
  </div>
</template>

<script>
export default {
  name: 'Tooltip',
  props: { text: String }
}
</script>

<style scoped>
.tooltip-wrapper {
  @apply relative inline-block;
}
.tooltip-content {
  @apply absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
         text-xs bg-gray-800 text-white rounded opacity-0 invisible 
         transition-opacity whitespace-nowrap;
}
.tooltip-wrapper:hover .tooltip-content {
  @apply opacity-100 visible;
}
</style>
