<template>
  <div class="info-row flex flex-col md:flex-row md:items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div class="md:w-1/4 text-gray-500 dark:text-gray-400 text-sm mb-1 md:mb-0">
      {{ label }}
    </div>
    <div class="md:w-3/4 text-gray-800 dark:text-white break-all">
      <slot>{{ value }}</slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InfoRow',
  props: {
    label: String,
    value: [String, Number],
    copyable: { type: Boolean, default: false }
  }
}
</script>
