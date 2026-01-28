<template>
  <div class="token-icon">
    <img v-if="src" v-lazy-image="src" :alt="symbol" @error="onError" />
    <span v-else>{{ symbol?.charAt(0) }}</span>
  </div>
</template>

<script>
export default {
  name: "TokenIcon",
  props: { src: String, symbol: String },
  methods: {
    onError(e) {
      e.target.style.display = "none";
    },
  },
};
</script>

<style scoped>
.token-icon {
  @apply w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium overflow-hidden;
}
.token-icon img {
  @apply w-full h-full object-cover;
}
</style>
