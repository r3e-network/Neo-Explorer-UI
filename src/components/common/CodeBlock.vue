<template>
  <code class="code-block">{{ code }}</code>
</template>

<script>
export default {
  name: 'CodeBlock',
  props: { code: String }
}
</script>

<style scoped>
.code-block {
  @apply block p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto;
}
</style>
