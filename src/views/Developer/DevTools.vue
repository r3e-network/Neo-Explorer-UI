<template>
  <div class="dev-tools min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Developer Tools</h1>
        <p class="text-gray-500">Useful tools for Neo N3 developers</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Unit Converter -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Unit Converter</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 mb-1">GAS Amount</label>
              <input v-model="gasAmount" type="number" placeholder="Enter GAS amount"
                class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-sm text-gray-500">In Fractions (10^-8)</p>
              <p class="text-xl font-mono">{{ gasInFractions }}</p>
            </div>
          </div>
        </div>

        <!-- Address Converter -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Address Converter</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 mb-1">Neo Address</label>
              <input v-model="address" type="text" placeholder="N..."
                class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm" />
            </div>
            <p class="text-sm text-gray-500">Script Hash conversion coming soon...</p>
          </div>
        </div>

        <!-- RPC Tester -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 md:col-span-2">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">RPC Endpoints</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-sm text-gray-500 mb-1">Mainnet</p>
              <code class="text-sm font-mono">https://mainnet1.neo.coz.io:443</code>
            </div>
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-sm text-gray-500 mb-1">Testnet</p>
              <code class="text-sm font-mono">https://testnet1.neo.coz.io:443</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DevTools',
  data() {
    return { gasAmount: '', address: '' }
  },
  computed: {
    gasInFractions() {
      const n = parseFloat(this.gasAmount) || 0
      return (n * 100000000).toLocaleString()
    }
  }
}
</script>
