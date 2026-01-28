<template>
  <input 
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    class="input-field"
    v-bind="$attrs"
  />
</template>

<script>
export default {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue']
}
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 rounded-lg 
         focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none;
}
</style>
