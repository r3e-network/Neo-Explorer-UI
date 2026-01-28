<template>
  <div class="loading-spinner">
    <div class="spinner"></div>
  </div>
</template>

<script>
export default { name: "LoadingSpinner" };
</script>

<style scoped>
.loading-spinner {
  @apply flex justify-center py-8;
}
.spinner {
  @apply w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin;
}
</style>
