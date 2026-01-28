<template>
  <div class="gas-display">
    <span class="value">{{ formatted }}</span>
    <span class="unit">GAS</span>
  </div>
</template>

<script>
export default {
  name: "GasDisplay",
  props: { amount: [Number, String] },
  computed: {
    formatted() {
      const n = Number(this.amount) / 1e8;
      return n.toFixed(8);
    },
  },
};
</script>

<style scoped>
.gas-display {
  @apply font-mono text-sm;
}
.unit {
  @apply text-gray-400 ml-1;
}
</style>
