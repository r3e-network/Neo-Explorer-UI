<template>
  <div class="latest-txs card">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-semibold">{{ $t('homePage.recentTxs') }}</h3>
      <router-link to="/transactions/1" class="text-sm text-primary-500">
        {{ $t('homePage.seeAll') }} →
      </router-link>
    </div>
    <div class="space-y-2">
      <TxListItem v-for="t in txs" :key="t.hash" :tx="t" />
    </div>
  </div>
</template>

<script>
import TxListItem from './TxListItem.vue'
export default {
  name: 'LatestTxs',
  components: { TxListItem },
  props: { txs: Array }
}
</script>
