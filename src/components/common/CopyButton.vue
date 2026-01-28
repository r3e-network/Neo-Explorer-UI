<template>
  <div class="copy-btn" @click="copy">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2"/>
    </svg>
    <span v-if="copied">Copied!</span>
  </div>
</template>

<script>
export default {
  name: 'CopyButton',
  props: { text: String },
  data: () => ({ copied: false }),
  methods: {
    copy() {
      navigator.clipboard.writeText(this.text)
      this.copied = true
      setTimeout(() => this.copied = false, 1500)
    }
  }
}
</script>

<style scoped>
.copy-btn {
  @apply inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer;
}
</style>
