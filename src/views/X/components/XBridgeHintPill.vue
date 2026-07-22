<template>
  <!-- Floating, dismissible prompt to bridge N3 GAS onto Neo X. Mainnet only
       (there is no public N3->Neo X bridge on testnet), and hidden once the
       user dismisses it (persisted). Fixed-position so it never shifts page
       layout. -->
  <Transition name="bridge-hint">
    <a
      v-if="visible"
      :href="BRIDGE_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="bridge-hint-pill"
      :aria-label="tf('neoX.bridgeHintAria', 'Bridge N3 GAS to Neo X — opens the official Neo X bridge in a new tab')"
      @click="onOpen"
    >
      <span class="bridge-hint-dot" aria-hidden="true"></span>
      <span class="bridge-hint-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16m0 0l-5-5m5 5l-5 5" />
        </svg>
      </span>
      <span class="min-w-0">
        <span class="bridge-hint-title">{{ tf("neoX.bridgeHintTitle", "Bridge GAS to Neo X") }}</span>
        <span class="bridge-hint-sub">{{ tf("neoX.bridgeHintSubtitle", "Move N3 GAS via the official bridge") }}</span>
      </span>
      <button
        type="button"
        class="bridge-hint-close"
        :aria-label="tf('neoX.bridgeHintDismiss', 'Dismiss')"
        @click.prevent.stop="dismiss"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </a>
  </Transition>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getNeoxNet, NEOX_NET } from "@/utils/neoxEnv";
import { useNetworkChange } from "@/composables/useNetworkChange";

const BRIDGE_URL = "https://xbridge.neo.org/";
const DISMISS_KEY = "neo_explorer_x_bridge_hint_dismissed";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

function readDismissed() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const activeNet = ref(getNeoxNet());
const dismissed = ref(readDismissed());
useNetworkChange(() => {
  activeNet.value = getNeoxNet();
});

const visible = computed(() => activeNet.value === NEOX_NET.Mainnet && !dismissed.value);

function dismiss() {
  dismissed.value = true;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode / storage disabled — hide for this session regardless */
  }
}

function onOpen() {
  // The anchor handles navigation (new tab, noopener). Nothing else needed;
  // kept as a hook so opening does not also count as a dismissal.
}
</script>

<style scoped>
.bridge-hint-pill {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  max-width: calc(100vw - 2rem);
  padding: 0.625rem 0.75rem 0.625rem 0.875rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--neo-green, #00e599) 45%, transparent);
  background: var(--surface-elevated);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.02);
  color: var(--text-high);
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.bridge-hint-pill:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--neo-green, #00e599) 75%, transparent);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.24), 0 0 18px rgba(0, 229, 153, 0.25);
}

.bridge-hint-dot {
  position: relative;
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--neo-green, #00e599);
}

.bridge-hint-dot::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: var(--neo-green, #00e599);
  animation: bridge-hint-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.bridge-hint-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--neo-green, #00e599);
}

.bridge-hint-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
}

.bridge-hint-sub {
  display: block;
  font-size: 0.6875rem;
  line-height: 1.2;
  color: var(--text-mid);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bridge-hint-close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-left: 0.125rem;
  border-radius: 9999px;
  color: var(--text-low);
  transition: background 0.15s ease, color 0.15s ease;
}

.bridge-hint-close:hover {
  background: var(--surface-hover);
  color: var(--text-high);
}

.bridge-hint-enter-active,
.bridge-hint-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.bridge-hint-enter-from,
.bridge-hint-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 480px) {
  .bridge-hint-sub {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bridge-hint-dot::after {
    animation: none;
  }
  .bridge-hint-pill,
  .bridge-hint-enter-active,
  .bridge-hint-leave-active {
    transition: none;
  }
}

@keyframes bridge-hint-ping {
  75%,
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
</style>
