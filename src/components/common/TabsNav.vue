<script setup>
defineProps({
  tabs: {
    type: Array,
    required: true,
    validator: (val) => val.length > 0 && val.every((t) => typeof t.key === "string" && typeof t.label === "string"),
  },
  modelValue: {
    type: String,
    required: true,
  },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div role="tablist" class="flex border-b border-gray-200 dark:border-gray-700 gap-1">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="modelValue === tab.key"
      :aria-label="tab.label"
      :class="[
        'px-4 py-2.5 text-sm font-medium transition-colors relative',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        modelValue === tab.key
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      ]"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span v-if="tab.count != null" class="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
        ({{ tab.count.toLocaleString() }})
      </span>
      <span
        v-if="modelValue === tab.key"
        class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t"
      />
    </button>
  </div>
</template>
