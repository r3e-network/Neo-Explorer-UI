<template>
  <div class="empty-state text-center py-12 px-4">
    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
      <!-- Block icon -->
      <svg v-if="icon === 'block'" class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/>
      </svg>
      <!-- Transaction icon -->
      <svg v-else-if="icon === 'transaction'" class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"/>
      </svg>
      <!-- Address icon -->
      <svg v-else-if="icon === 'address'" class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <!-- Default inbox icon -->
      <svg v-else class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
      </svg>
    </div>
    <p class="text-gray-500 dark:text-gray-400 font-medium">{{ message }}</p>
    <p v-if="description" class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ description }}</p>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    message: { type: String, default: 'No data available' },
    description: { type: String, default: '' },
    icon: { type: String, default: 'default' }
  }
}
</script>
