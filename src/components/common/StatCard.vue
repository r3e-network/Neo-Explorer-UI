<template>
  <div 
    class="stat-card bg-white dark:bg-gray-800 rounded-xl shadow-card p-4 cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-4">
      <div :class="iconWrapperClass">
        <component :is="iconComponent" class="w-6 h-6" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-1 truncate">{{ label }}</p>
        <p class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white truncate">
          <template v-if="loading">
            <span class="inline-block w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
          </template>
          <template v-else>
            <slot>{{ formattedValue }}</slot>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import BlockIcon from '@/components/icons/BlockIcon.vue'
import TransactionIcon from '@/components/icons/TransactionIcon.vue'
import ContractIcon from '@/components/icons/ContractIcon.vue'
import AddressIcon from '@/components/icons/AddressIcon.vue'

export default {
  name: 'StatCard',
  components: { BlockIcon, TransactionIcon, ContractIcon, AddressIcon },
  props: {
    label: String,
    value: [Number, String],
    icon: { type: String, default: 'block' },
    color: { type: String, default: 'primary' },
    format: { type: String, default: 'number' },
    loading: { type: Boolean, default: false },
    route: String
  },
  emits: ['click'],
  
  computed: {
    formattedValue() {
      if (this.format === 'number' && typeof this.value === 'number') {
        return this.value.toLocaleString()
      }
      return this.value
    },
    
    iconComponent() {
      const icons = {
        block: 'BlockIcon',
        transaction: 'TransactionIcon',
        contract: 'ContractIcon',
        address: 'AddressIcon'
      }
      return icons[this.icon] || 'BlockIcon'
    },
    
    iconWrapperClass() {
      const colors = {
        primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-500',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-500',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-500',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'
      }
      return `w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${colors[this.color] || colors.primary}`
    }
  }
}
</script>
