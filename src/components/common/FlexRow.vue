<template>
  <div class="flex-row" :class="[justify, align]">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: "FlexRow",
  props: {
    justify: { type: String, default: "between" },
    align: { type: String, default: "center" },
  },
};
</script>

<style scoped>
.flex-row {
  @apply flex gap-4;
}
.between {
  @apply justify-between;
}
.center {
  @apply items-center;
}
</style>
