<template>
  <div class="info-row flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-100 dark:border-gray-700">
    <span class="label text-gray-500 dark:text-gray-400 text-sm mb-1 sm:mb-0">{{ label }}</span>
    <div class="value flex items-center gap-2">
      <router-link v-if="link && value" :to="linkTo" class="text-primary-500 hover:text-primary-600 font-mono text-sm break-all">
        {{ displayValue }}
      </router-link>
      <span v-else class="font-medium text-gray-900 dark:text-white break-all">
        <slot>{{ displayValue }}</slot>
      </span>
      <button v-if="copyable && value" @click="copyValue" class="copy-btn p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InfoRow',
  props: {
    label: String,
    value: [String, Number],
    copyable: Boolean,
    link: Boolean,
    truncate: { type: Boolean, default: false }
  },
  computed: {
    displayValue() {
      if (!this.value) return '-'
      if (this.truncate && typeof this.value === 'string' && this.value.length > 20) {
        return `${this.value.slice(0, 10)}...${this.value.slice(-8)}`
      }
      return this.value
    },
    linkTo() {
      if (!this.value) return ''
      if (this.value.startsWith('0x') && this.value.length === 66) {
        return `/blockinfo/${this.value}`
      }
      return `/accountprofile/${this.value}`
    }
  },
  methods: {
    async copyValue() {
      try {
        await navigator.clipboard.writeText(this.value)
      } catch (e) {
        console.error('Copy failed:', e)
      }
    }
  }
}
</script>
