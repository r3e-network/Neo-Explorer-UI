<template>
  <div class="tabs">
    <div class="tab-list">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab', { active: active === tab.key }]"
        @click="$emit('change', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="tab-content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "Tabs",
  props: {
    tabs: Array,
    active: String,
  },
  emits: ["change"],
};
</script>

<style scoped>
.tab-list {
  @apply flex gap-1 border-b border-gray-200 mb-4;
}
.tab {
  @apply px-4 py-2 text-sm text-gray-500 border-b-2 border-transparent;
}
.tab.active {
  @apply text-primary-500 border-primary-500;
}
</style>
