<template>
  <span :class="['badge', type]">{{ text }}</span>
</template>

<script>
export default {
  name: 'Badge',
  props: {
    text: String,
    type: { type: String, default: 'default' }
  }
}
</script>

<style scoped>
.badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}
.badge.default { @apply bg-gray-100 text-gray-600; }
.badge.success { @apply bg-green-100 text-green-700; }
.badge.warning { @apply bg-yellow-100 text-yellow-700; }
.badge.error { @apply bg-red-100 text-red-700; }
</style>
