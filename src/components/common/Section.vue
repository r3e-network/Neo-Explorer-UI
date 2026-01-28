<template>
  <section class="section">
    <slot></slot>
  </section>
</template>

<script>
export default { name: "Section" };
</script>

<style scoped>
.section {
  @apply py-8;
}
</style>
