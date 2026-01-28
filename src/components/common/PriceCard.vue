<template>
  <div class="price-card card">
    <div class="flex items-center gap-3 mb-3">
      <img :src="icon" :alt="symbol" class="w-8 h-8" />
      <span class="font-semibold">{{ symbol }}</span>
    </div>
    <p class="text-2xl font-bold">${{ price }}</p>
    <p :class="['text-sm', change >= 0 ? 'text-green-500' : 'text-red-500']">
      {{ change >= 0 ? '+' : '' }}{{ change }}%
    </p>
  </div>
</template>

<script>
export default {
  name: 'PriceCard',
  props: {
    symbol: String,
    price: [Number, String],
    change: Number,
    icon: String
  }
}
</script>
