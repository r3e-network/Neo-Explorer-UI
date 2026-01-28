<template>
  <span class="tag">{{ text }}</span>
</template>

<script>
export default {
  name: "Tag",
  props: { text: String },
};
</script>

<style scoped>
.tag {
  @apply px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded;
}
</style>
