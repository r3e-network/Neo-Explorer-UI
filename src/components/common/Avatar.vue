<template>
  <div class="avatar" :style="{ backgroundColor: color }">
    {{ initial }}
  </div>
</template>

<script>
export default {
  name: "Avatar",
  props: { name: String },
  computed: {
    initial() {
      return this.name?.charAt(0).toUpperCase() || "?";
    },
    color() {
      const h = (this.name?.charCodeAt(0) * 137) % 360 || 0;
      return `hsl(${h}, 60%, 70%)`;
    },
  },
};
</script>

<style scoped>
.avatar {
  @apply w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium;
}
</style>
