<template>
  <div class="burn-gas min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">GAS Burn Statistics</h1>
        <p class="text-gray-500">Network fee burn analytics</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <p class="text-sm text-gray-500 mb-1">Total Burned</p>
          <p class="text-2xl font-bold text-orange-500">{{ formatGas(totalBurned) }} GAS</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <p class="text-sm text-gray-500 mb-1">Today</p>
          <p class="text-2xl font-bold text-gray-800 dark:text-white">{{ formatGas(todayBurned) }} GAS</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <p class="text-sm text-gray-500 mb-1">This Week</p>
          <p class="text-2xl font-bold text-gray-800 dark:text-white">{{ formatGas(weekBurned) }} GAS</p>
        </div>
      </div>

      <!-- Chart -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Daily Burn Rate</h3>
        <div class="h-64 flex items-center justify-center text-gray-400">
          Chart coming soon...
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BurnGasNew',
  data() {
    return { totalBurned: 0, todayBurned: 0, weekBurned: 0 }
  },
  methods: {
    formatGas(v) {
      return v ? v.toLocaleString() : '0'
    }
  }
}
</script>
