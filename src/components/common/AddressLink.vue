<template>
  <span class="address-link">
    <router-link :to="`/accountprofile/${address}`">
      {{ short }}
    </router-link>
  </span>
</template>

<script>
export default {
  name: 'AddressLink',
  props: { address: String },
  computed: {
    short() {
      if (!this.address) return ''
      return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`
    }
  }
}
</script>

<style scoped>
.address-link a {
  @apply text-primary-500 hover:underline font-mono text-sm;
}
</style>
