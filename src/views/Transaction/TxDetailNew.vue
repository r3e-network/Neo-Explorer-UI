<template>
  <div class="tx-detail">
    <Container>
      <PageHeader title="Transaction Details" />
      <div class="card">
        <InfoRow label="Hash" :value="tx.hash" />
        <InfoRow label="Block" :value="tx.blockindex" />
        <InfoRow label="Size" :value="`${tx.size} bytes`" />
      </div>
    </Container>
  </div>
</template>

<script>
import { rpc } from '@/services/api'
export default {
  name: 'TxDetail',
  data: () => ({ tx: {} }),
  created() { this.loadTx() },
  methods: {
    async loadTx() {
      const hash = this.$route.params.txhash
      this.tx = await rpc('GetRawTransactionByTransactionHash', { TransactionHash: hash }) || {}
    }
  }
}
</script>
