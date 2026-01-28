<template>
  <div class="json-view">
    <pre>{{ formatted }}</pre>
  </div>
</template>

<script>
export default {
  name: 'JsonView',
  props: { data: [Object, Array] },
  computed: {
    formatted() {
      return JSON.stringify(this.data, null, 2)
    }
  }
}
</script>

<style scoped>
.json-view pre {
  @apply p-4 bg-gray-50 rounded-lg text-sm overflow-x-auto;
}
</style>
