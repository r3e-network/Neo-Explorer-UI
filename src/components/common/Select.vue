<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', $event.target.value)"
    class="select-field"
  >
    <slot></slot>
  </select>
</template>

<script>
export default {
  name: "Select",
  props: ["modelValue"],
  emits: ["update:modelValue"],
};
</script>

<style scoped>
.select-field {
  @apply px-3 py-2 border border-gray-200 rounded-lg bg-white;
}
</style>
