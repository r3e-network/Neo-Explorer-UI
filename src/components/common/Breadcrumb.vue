<template>
  <nav class="breadcrumb">
    <template v-for="(item, i) in items" :key="i">
      <router-link v-if="item.to" :to="item.to">{{ item.text }}</router-link>
      <span v-else>{{ item.text }}</span>
      <span v-if="i < items.length - 1" class="sep">/</span>
    </template>
  </nav>
</template>

<script>
export default {
  name: "Breadcrumb",
  props: { items: Array },
};
</script>

<style scoped>
.breadcrumb {
  @apply flex items-center gap-2 text-sm text-gray-500;
}
.breadcrumb a {
  @apply hover:text-primary-500;
}
.sep {
  @apply text-gray-300;
}
</style>
