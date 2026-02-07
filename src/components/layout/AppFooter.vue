<template>
  <footer class="app-footer mt-12 border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
    <div class="mx-auto max-w-[1400px] px-4 py-10">
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <!-- Brand Column -->
        <div>
          <div class="mb-3 flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-neo-green text-xs font-bold text-gray-900"
            >
              N3
            </div>
            <span class="text-lg font-semibold text-text-primary dark:text-gray-100">Neo Explorer</span>
          </div>
          <p class="mb-4 text-sm text-text-secondary dark:text-gray-400">
            Blockchain explorer and analytics platform for Neo N3.
          </p>
          <!-- Social Icons -->
          <div class="flex items-center gap-3">
            <a href="https://github.com/neo-project" target="_blank" class="social-icon" title="GitHub">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                />
              </svg>
            </a>
            <a href="https://twitter.com/neo_blockchain" target="_blank" class="social-icon" title="X (Twitter)">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </a>
            <a href="https://neo.org" target="_blank" class="social-icon" title="Neo.org">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                />
              </svg>
            </a>
          </div>
          <!-- Powered by badge -->
          <div
            class="mt-4 inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            Powered by <strong class="text-neo-green">Neo N3</strong>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-primary dark:text-gray-100">
            Explorer
          </h3>
          <ul class="space-y-2 text-sm">
            <li><router-link to="/blocks/1" class="footer-link">Blocks</router-link></li>
            <li>
              <router-link to="/Transactions/1" class="footer-link">Transactions</router-link>
            </li>
            <li>
              <router-link to="/contracts/1" class="footer-link">Contracts</router-link>
            </li>
            <li><router-link to="/tokens/nep17/1" class="footer-link">Tokens</router-link></li>
          </ul>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-primary dark:text-gray-100">
            Community
          </h3>
          <ul class="space-y-2 text-sm">
            <li><a href="https://docs.neo.org" target="_blank" class="footer-link">Documentation</a></li>
            <li><a href="https://neo.org" target="_blank" class="footer-link">Neo.org</a></li>
            <li>
              <a href="https://github.com/neo-project" target="_blank" class="footer-link">GitHub</a>
            </li>
            <li>
              <a href="https://twitter.com/neo_blockchain" target="_blank" class="footer-link">X (Twitter)</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-primary dark:text-gray-100">
            Products
          </h3>
          <ul class="space-y-2 text-sm">
            <li><router-link to="/api-docs" class="footer-link">API Docs</router-link></li>
            <li><router-link to="/echarts" class="footer-link">Charts</router-link></li>
            <li><router-link to="/burn" class="footer-link">Burned GAS</router-link></li>
            <li><router-link to="/homepage" class="footer-link">Homepage</router-link></li>
          </ul>
        </div>
      </div>

      <div
        class="mt-8 flex flex-col items-start justify-between gap-2 border-t border-gray-200 pt-5 text-xs text-text-secondary dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center"
      >
        <p>© {{ currentYear }} Neo Explorer</p>
        <button
          class="font-medium text-text-secondary hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400"
          @click="scrollTop"
        >
          Back to Top ↑
        </button>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: "AppFooter",
  computed: {
    currentYear() {
      return new Date().getFullYear();
    },
  },
  methods: {
    scrollTop() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  },
};
</script>

<style scoped>
.social-icon {
  @apply flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-500
         transition-colors hover:bg-primary-500 hover:text-white
         dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-primary-600;
}
</style>
