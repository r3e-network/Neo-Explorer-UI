<template>
  <ul class="hidden items-center gap-0.5 lg:flex">
    <li>
      <router-link to="/homepage" class="nav-link" active-class="nav-link-active">Home</router-link>
    </li>
    <li
      class="nav-dropdown"
      @mouseenter="$emit('open-dropdown', 'blockchain')"
      @mouseleave="$emit('close-dropdown', 'blockchain')"
      @focusout="handleFocusOut('blockchain')"
    >
      <button
        class="nav-link"
        aria-label="Blockchain menu"
        aria-haspopup="true"
        :aria-expanded="activeDropdown === 'blockchain'"
        @click="$emit(activeDropdown === 'blockchain' ? 'close-dropdown' : 'open-dropdown', 'blockchain')"
        @keydown.enter.prevent="
          $emit(activeDropdown === 'blockchain' ? 'close-dropdown' : 'open-dropdown', 'blockchain')
        "
        @keydown.space.prevent="
          $emit(activeDropdown === 'blockchain' ? 'close-dropdown' : 'open-dropdown', 'blockchain')
        "
        @keydown.escape="$emit('close-dropdown', 'blockchain')"
      >
        Blockchain
        <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <div
        v-show="activeDropdown === 'blockchain'"
        class="dropdown-panel"
        @keydown.escape="$emit('close-dropdown', 'blockchain')"
      >
        <router-link to="/blocks/1" class="dropdown-link">Blocks</router-link>
        <router-link to="/transactions/1" class="dropdown-link">Transactions</router-link>
        <router-link to="/account/1" class="dropdown-link">Accounts</router-link>
        <router-link to="/candidates/1" class="dropdown-link">Consensus Nodes</router-link>
      </div>
    </li>
    <li
      class="nav-dropdown"
      @mouseenter="$emit('open-dropdown', 'tokens')"
      @mouseleave="$emit('close-dropdown', 'tokens')"
      @focusout="handleFocusOut('tokens')"
    >
      <button
        class="nav-link"
        aria-label="Tokens menu"
        aria-haspopup="true"
        :aria-expanded="activeDropdown === 'tokens'"
        @click="$emit(activeDropdown === 'tokens' ? 'close-dropdown' : 'open-dropdown', 'tokens')"
        @keydown.enter.prevent="$emit(activeDropdown === 'tokens' ? 'close-dropdown' : 'open-dropdown', 'tokens')"
        @keydown.space.prevent="$emit(activeDropdown === 'tokens' ? 'close-dropdown' : 'open-dropdown', 'tokens')"
        @keydown.escape="$emit('close-dropdown', 'tokens')"
      >
        Tokens
        <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <div
        v-show="activeDropdown === 'tokens'"
        class="dropdown-panel"
        @keydown.escape="$emit('close-dropdown', 'tokens')"
      >
        <router-link to="/tokens/nep17/1" class="dropdown-link">NEP-17 Tokens</router-link>
        <router-link to="/tokens/nep11/1" class="dropdown-link">NEP-11 NFTs</router-link>
      </div>
    </li>
    <li>
      <router-link to="/contracts/1" class="nav-link" active-class="nav-link-active">Contracts</router-link>
    </li>
    <li
      class="nav-dropdown"
      @mouseenter="$emit('open-dropdown', 'resources')"
      @mouseleave="$emit('close-dropdown', 'resources')"
      @focusout="handleFocusOut('resources')"
    >
      <button
        class="nav-link"
        aria-label="Resources menu"
        aria-haspopup="true"
        :aria-expanded="activeDropdown === 'resources'"
        @click="$emit(activeDropdown === 'resources' ? 'close-dropdown' : 'open-dropdown', 'resources')"
        @keydown.enter.prevent="$emit(activeDropdown === 'resources' ? 'close-dropdown' : 'open-dropdown', 'resources')"
        @keydown.space.prevent="$emit(activeDropdown === 'resources' ? 'close-dropdown' : 'open-dropdown', 'resources')"
        @keydown.escape="$emit('close-dropdown', 'resources')"
      >
        Resources
        <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <div
        v-show="activeDropdown === 'resources'"
        class="dropdown-panel"
        @keydown.escape="$emit('close-dropdown', 'resources')"
      >
        <router-link to="/echarts" class="dropdown-link">Charts &amp; Stats</router-link>
        <router-link to="/gas-tracker" class="dropdown-link">Gas Tracker</router-link>
        <router-link to="/burn" class="dropdown-link">Burned GAS</router-link>
      </div>
    </li>
    <li
      class="nav-dropdown"
      @mouseenter="$emit('open-dropdown', 'developers')"
      @mouseleave="$emit('close-dropdown', 'developers')"
      @focusout="handleFocusOut('developers')"
    >
      <button
        class="nav-link"
        aria-label="Developers menu"
        aria-haspopup="true"
        :aria-expanded="activeDropdown === 'developers'"
        @click="$emit(activeDropdown === 'developers' ? 'close-dropdown' : 'open-dropdown', 'developers')"
        @keydown.enter.prevent="
          $emit(activeDropdown === 'developers' ? 'close-dropdown' : 'open-dropdown', 'developers')
        "
        @keydown.space.prevent="
          $emit(activeDropdown === 'developers' ? 'close-dropdown' : 'open-dropdown', 'developers')
        "
        @keydown.escape="$emit('close-dropdown', 'developers')"
      >
        Developers
        <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <div
        v-show="activeDropdown === 'developers'"
        class="dropdown-panel"
        @keydown.escape="$emit('close-dropdown', 'developers')"
      >
        <router-link to="/api-docs" class="dropdown-link">API Docs</router-link>
        <router-link to="/verify-contract/" class="dropdown-link">Verify Contract</router-link>
        <router-link to="/source-code" class="dropdown-link">Source Code</router-link>
      </div>
    </li>
  </ul>
</template>

<script setup>
const emit = defineEmits(["open-dropdown", "close-dropdown"]);

defineProps({
  activeDropdown: { type: String, default: null },
});

function handleFocusOut(name) {
  setTimeout(() => {
    const el = document.activeElement;
    const dropdown = document.querySelector(
      `.nav-dropdown:has([aria-label="${name.charAt(0).toUpperCase() + name.slice(1)} menu"])`
    );
    if (dropdown && !dropdown.contains(el)) {
      emit("close-dropdown", name);
    }
  }, 0);
}
</script>

<style scoped>
.nav-link {
  @apply inline-flex items-center rounded px-3 py-2 text-sm font-medium text-white/80
         transition-colors hover:text-white;
}

.nav-link-active {
  @apply text-white;
}

.nav-dropdown {
  @apply relative;
}

.dropdown-panel {
  @apply absolute left-0 top-full z-50 mt-1 w-52 rounded border border-gray-200
         bg-white p-1.5 shadow-dropdown dark:border-gray-700 dark:bg-gray-800;
}

.dropdown-link {
  @apply block rounded px-3 py-2 text-sm text-gray-700 no-underline
         transition-colors hover:bg-gray-50 hover:text-primary-500
         dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400;
}
</style>
