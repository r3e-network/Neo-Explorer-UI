<template>
  <footer class="app-footer bg-gray-900 text-gray-400">
    <div class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <!-- About -->
        <div>
          <h4 class="text-white font-semibold mb-4">Neo Explorer</h4>
          <p class="text-sm">Blockchain explorer for Neo N3</p>
        </div>
        <!-- Links -->
        <div>
          <h4 class="text-white font-semibold mb-4">Explore</h4>
          <ul class="space-y-2 text-sm">
            <li><router-link to="/blocks/1" class="hover:text-white">Blocks</router-link></li>
            <li><router-link to="/Transactions/1" class="hover:text-white">Transactions</router-link></li>
          </ul>
        </div>
        <!-- Resources -->
        <div>
          <h4 class="text-white font-semibold mb-4">Resources</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="https://neo.org" target="_blank" class="hover:text-white">Neo.org</a></li>
            <li><a href="https://docs.neo.org" target="_blank" class="hover:text-white">Documentation</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-gray-800 pt-6 text-center text-sm">
        <p>© 2024 Neo Explorer. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script>
export default { name: 'AppFooter' }
</script>
