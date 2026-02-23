<template>
  <ul class="hidden items-center gap-0.5 lg:flex">
    <li>
      <router-link to="/homepage" class="nav-link" active-class="nav-link-active">{{ $t("nav.home") }}</router-link>
    </li>
    <li
      class="nav-dropdown group"
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
        {{ $t("nav.blockchain") }}
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
        <router-link to="/blocks/1" class="dropdown-link">{{ $t("nav.blocks") }}</router-link>
        <router-link to="/transactions/1" class="dropdown-link">{{ $t("nav.transactions") }}</router-link>
        <router-link to="/account/1" class="dropdown-link">{{ $t("nav.accounts") }}</router-link>
        <router-link to="/candidates/1" class="dropdown-link">{{ $t("nav.consensusNodes") }}</router-link>
        <router-link to="/governance" class="dropdown-link">{{ $t("nav.governance") }}</router-link>
      </div>
    </li>
    <li
      class="nav-dropdown group"
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
        {{ $t("nav.tokens") }}
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
        <router-link to="/tokens/nep17/1" class="dropdown-link">{{ $t("nav.nep17") }}</router-link>
        <router-link to="/tokens/nep11/1" class="dropdown-link">{{ $t("nav.nep11") }}</router-link>
      </div>
    </li>
    <li>
      <router-link to="/contracts/1" class="nav-link" active-class="nav-link-active">{{ $t("nav.contracts") }}</router-link>
    </li>
    <li
      class="nav-dropdown group"
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
        {{ $t("nav.resources") }}
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
        <router-link to="/treasury" class="dropdown-link">{{ $t("nav.treasury") || "Treasury" }}</router-link>
        <router-link to="/nns" class="dropdown-link">Neo Name Service</router-link>
        <router-link to="/echarts" class="dropdown-link">{{ $t("nav.chartsStats") }}</router-link>
        <router-link to="/gas-tracker" class="dropdown-link">{{ $t("nav.gasTracker") }}</router-link>
        <router-link to="/burn" class="dropdown-link">{{ $t("nav.burnedGas") }}</router-link>
      </div>
    </li>
    <li
      class="nav-dropdown group"
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
        {{ $t("nav.developers") }}
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
        <router-link to="/api-docs" class="dropdown-link">{{ $t("nav.apiDocs") }}</router-link>
        <router-link to="/verify-contract/" class="dropdown-link">{{ $t("nav.verifyContract") }}</router-link>
        <router-link to="/source-code" class="dropdown-link">{{ $t("nav.sourceCode") }}</router-link>
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
  @apply inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 transition-all duration-300;
}

.nav-link:hover {
  color: var(--link);
  background: color-mix(in srgb, var(--link) 10%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--link) 10%, transparent);
}

.nav-link-active {
  color: var(--link);
  background: color-mix(in srgb, var(--link) 15%, transparent);
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--link) 15%, transparent);
}

.nav-dropdown {
  @apply relative;
}

.dropdown-panel {
  @apply absolute left-0 top-full z-50 mt-4 w-56 rounded-2xl border bg-white/60 dark:bg-[#071520]/80 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-xl backdrop-saturate-[180%] transform transition-all duration-300;
  border-color: color-mix(in srgb, var(--line-soft) 80%, transparent);
}

.dropdown-link {
  @apply block rounded-xl px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 no-underline transition-all duration-200;
}

.dropdown-link:hover {
  color: var(--link);
  background: color-mix(in srgb, var(--link) 10%, transparent);
  @apply translate-x-1;
}
</style>
