<template>
  <div class="address-detail">
    <Container>
      <PageHeader title="Address Details" />
      <div class="card">
        <InfoRow label="Address" :value="address" />
        <InfoRow label="NEO Balance" :value="neoBalance" />
        <InfoRow label="GAS Balance" :value="gasBalance" />
      </div>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'AddressDetail',
  data: () => ({ neoBalance: 0, gasBalance: 0 }),
  computed: {
    address() { return this.$route.params.accountAddress }
  }
}
</script>
