<template>
  <div class="token-detail">
    <Container>
      <PageHeader title="Token Details" />
      <div class="card">
        <InfoRow label="Symbol" :value="token.symbol" />
        <InfoRow label="Name" :value="token.name" />
        <InfoRow label="Decimals" :value="token.decimals" />
      </div>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'TokenDetail',
  data: () => ({ token: {} })
}
</script>
