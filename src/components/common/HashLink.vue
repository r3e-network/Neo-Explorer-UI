<template>
  <span class="hash-link" :title="hash">
    <router-link :to="link">{{ shortHash }}</router-link>
    <button @click="copy" class="copy-btn">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  </span>
</template>

<script>
export default {
  name: 'HashLink',
  props: {
    hash: String,
    link: String,
    length: { type: Number, default: 8 }
  },
  computed: {
    shortHash() {
      if (!this.hash) return ''
      return `${this.hash.slice(0, this.length)}...${this.hash.slice(-this.length)}`
    }
  },
  methods: {
    copy() {
      navigator.clipboard.writeText(this.hash)
    }
  }
}
</script>

<style scoped>
.hash-link {
  @apply inline-flex items-center gap-1 font-mono text-sm;
}
.hash-link a {
  @apply text-primary-500 hover:text-primary-600;
}
.copy-btn {
  @apply text-gray-400 hover:text-gray-600 transition-colors;
}
</style>
