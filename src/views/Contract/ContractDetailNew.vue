<template>
  <div class="contract-detail">
    <Container>
      <PageHeader title="Contract Details" />
      <div class="card">
        <InfoRow label="Hash" :value="contract.hash" />
        <InfoRow label="Name" :value="contract.name" />
      </div>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'ContractDetail',
  data: () => ({ contract: {} })
}
</script>
