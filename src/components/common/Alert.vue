<template>
  <div class="alert" :class="type">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: "Alert",
  props: { type: { type: String, default: "info" } },
};
</script>

<style scoped>
.alert {
  @apply p-4 rounded-lg text-sm;
}
.alert.info {
  @apply bg-blue-50 text-blue-700;
}
.alert.success {
  @apply bg-green-50 text-green-700;
}
.alert.warning {
  @apply bg-yellow-50 text-yellow-700;
}
.alert.error {
  @apply bg-red-50 text-red-700;
}
</style>
