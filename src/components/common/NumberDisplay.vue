<template>
  <span class="number-display">{{ formatted }}</span>
</template>

<script>
export default {
  name: 'NumberDisplay',
  props: { value: [Number, String], decimals: { type: Number, default: 0 } },
  computed: {
    formatted() {
      const n = Number(this.value)
      return n.toLocaleString(undefined, { maximumFractionDigits: this.decimals })
    }
  }
}
</script>
