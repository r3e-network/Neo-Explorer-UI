<template>
  <footer class="footer bg-gray-900 text-gray-400 py-12">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Brand -->
        <div class="col-span-1 md:col-span-2">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-neo-green flex items-center justify-center">
              <span class="text-white font-bold text-lg">N</span>
            </div>
            <span class="text-white font-bold text-xl">Neo Explorer</span>
          </div>
          <p class="text-sm leading-relaxed mb-4 max-w-md">
            Neo N3 Blockchain Explorer - Explore blocks, transactions, 
            addresses, contracts, and tokens on the Neo Smart Economy.
          </p>
          <div class="flex gap-3">
            <a href="https://neo.org" target="_blank" 
               class="social-link" aria-label="Neo Website">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </a>
            <a href="https://github.com/neo-project" target="_blank" 
               class="social-link" aria-label="GitHub">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a href="https://twitter.com/neo_blockchain" target="_blank" 
               class="social-link" aria-label="Twitter">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
          </div>
        </div>
        
        <!-- Quick Links -->
        <div>
          <h4 class="text-white font-semibold mb-4">Explore</h4>
          <ul class="space-y-2 text-sm">
            <li><router-link to="/blocks/1" class="footer-link">Blocks</router-link></li>
            <li><router-link to="/Transactions/1" class="footer-link">Transactions</router-link></li>
            <li><router-link to="/contracts/1" class="footer-link">Contracts</router-link></li>
            <li><router-link to="/tokens/nep17/1" class="footer-link">Tokens</router-link></li>
          </ul>
        </div>
        
        <!-- Resources -->
        <div>
          <h4 class="text-white font-semibold mb-4">Resources</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="https://docs.neo.org" target="_blank" class="footer-link">Documentation</a></li>
            <li><a href="https://neo.org" target="_blank" class="footer-link">Neo.org</a></li>
            <li><a href="https://github.com/neo-project" target="_blank" class="footer-link">GitHub</a></li>
          </ul>
        </div>
      </div>
      
      <!-- Bottom -->
      <div class="border-t border-gray-800 mt-10 pt-6 text-center text-sm">
        <p>© {{ currentYear }} Neo Explorer. Powered by Neo N3.</p>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter',
  computed: {
    currentYear() {
      return new Date().getFullYear()
    }
  }
}
</script>

<style scoped>
.social-link {
  @apply w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center
         hover:bg-neo-green hover:text-white transition-colors;
}
.footer-link {
  @apply hover:text-neo-green transition-colors;
}
</style>
