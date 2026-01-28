<template>
  <span :class="['status-dot', status]"></span>
</template>

<script>
export default {
  name: 'StatusDot',
  props: { status: { type: String, default: 'success' } }
}
</script>

<style scoped>
.status-dot {
  @apply w-2 h-2 rounded-full inline-block;
}
.status-dot.success { @apply bg-green-500; }
.status-dot.pending { @apply bg-yellow-500; }
.status-dot.error { @apply bg-red-500; }
</style>
