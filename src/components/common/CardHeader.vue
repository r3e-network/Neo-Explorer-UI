<template>
  <div class="card-header">
    <h3 class="title">{{ title }}</h3>
    <slot name="actions"></slot>
  </div>
</template>

<script>
export default {
  name: 'CardHeader',
  props: { title: String }
}
</script>

<style scoped>
.card-header {
  @apply flex justify-between items-center mb-4;
}
.title { @apply font-semibold text-lg; }
</style>
