<template>
  <div class="network-badge" :class="network">
    {{ network }}
  </div>
</template>

<script>
export default {
  name: "NetworkBadge",
  props: { network: { type: String, default: "mainnet" } },
};
</script>

<style scoped>
.network-badge {
  @apply px-2 py-1 text-xs font-medium rounded;
}
.network-badge.mainnet {
  @apply bg-green-100 text-green-700;
}
.network-badge.testnet {
  @apply bg-yellow-100 text-yellow-700;
}
</style>
