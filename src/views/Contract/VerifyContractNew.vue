<template>
  <div class="verify-contract min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Verify Contract
        </h1>
        <p class="text-gray-500">
          Verify and publish your contract source code
        </p>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div class="space-y-6">
          <!-- Contract Hash -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Contract Hash
            </label>
            <input
              v-model="hash"
              type="text"
              placeholder="0x..."
              class="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono"
            />
          </div>

          <!-- Compiler Version -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Compiler Version
            </label>
            <select
              v-model="compiler"
              class="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Select compiler version</option>
              <option value="neo3-boa-0.14">neo3-boa 0.14.x</option>
              <option value="neow3j-3.21">neow3j 3.21.x</option>
            </select>
          </div>

          <!-- Source Code -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Source Code
            </label>
            <textarea
              v-model="sourceCode"
              rows="10"
              placeholder="Paste your contract source code here..."
              class="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
            ></textarea>
          </div>

          <!-- Submit -->
          <button
            @click="verify"
            :disabled="!canSubmit"
            class="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
          >
            Verify Contract
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "VerifyContractNew",
  data() {
    return { hash: "", compiler: "", sourceCode: "" };
  },
  computed: {
    canSubmit() {
      return this.hash && this.compiler && this.sourceCode;
    },
  },
  methods: {
    verify() {
      alert("Contract verification coming soon!");
    },
  },
};
</script>
