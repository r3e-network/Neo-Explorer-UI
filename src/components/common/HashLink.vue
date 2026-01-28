<template>
  <div class="hash-link inline-flex items-center gap-2">
    <router-link 
      :to="linkPath" 
      class="font-mono text-sm text-primary-500 hover:text-primary-600 truncate max-w-xs"
    >
      {{ displayHash }}
    </router-link>
    <CopyButton :text="hash" />
  </div>
</template>

<script>
import CopyButton from './CopyButton.vue'

export default {
  name: 'HashLink',
  components: { CopyButton },
  props: {
    hash: String,
    type: { type: String, default: 'tx' },
    truncate: { type: Boolean, default: true }
  },
  computed: {
    displayHash() {
      if (!this.hash) return ''
      if (!this.truncate) return this.hash
      return `${this.hash.slice(0, 10)}...${this.hash.slice(-8)}`
    },
    linkPath() {
      const routes = {
        block: `/blockinfo/${this.hash}`,
        tx: `/transactionInfo/${this.hash}`,
        address: `/accountprofile/${this.hash}`,
        contract: `/contractinfo/${this.hash}`
      }
      return routes[this.type] || routes.tx
    }
  }
}
</script>
