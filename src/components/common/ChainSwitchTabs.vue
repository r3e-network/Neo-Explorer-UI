<template>
  <div
    role="group"
    :aria-label="tf('neoX.chainSwitcherAria', 'Switch chain and network')"
    class="surface-panel inline-flex flex-wrap items-center gap-1 p-1"
  >
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="tab-btn inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary-500"
      :class="isActive(option) ? 'tab-btn-active' : 'tab-btn-inactive'"
      :aria-pressed="isActive(option)"
      @click="select(option)"
    >
      <span
        aria-hidden="true"
        class="h-2 w-2 rounded-full"
        :class="option.chain === 'neox' ? 'bg-violet-500' : 'bg-primary-500'"
      ></span>
      {{ option.name }}
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { NETWORK_CHANGE_EVENT, NETWORK_OPTIONS, getCurrentEnv, setCurrentEnv } from "@/utils/env";
import { NEOX_NETWORK_OPTIONS, getNeoxNet, setNeoxNet } from "@/utils/neoxEnv";

const router = useRouter();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// N3 first, then Neo X — same ordering as the AppHeader network dropdown.
const options = [
  ...NETWORK_OPTIONS.map((option) => ({ ...option, chain: "n3" })),
  ...NEOX_NETWORK_OPTIONS,
];

const currentEnv = ref(getCurrentEnv());
const currentNeoxNet = ref(getNeoxNet());

// The chain axis is derived from the route (/x tree = Neo X), matching
// AppHeader's isNeoxRoute derivation. Read through router.currentRoute (a
// reactive ref) so the component only depends on the useRouter injection.
const isNeoxRoute = computed(() => String(router.currentRoute?.value?.path || "").startsWith("/x"));

function isActive(option) {
  if (option.chain === "neox") {
    return isNeoxRoute.value && option.id === currentNeoxNet.value;
  }
  return !isNeoxRoute.value && option.id === currentEnv.value;
}

// Mirrors AppHeader.selectNetwork: set the net for the target chain, then
// route into the matching tree when the current route is on the other chain.
function select(option) {
  if (option.chain === "neox") {
    currentNeoxNet.value = setNeoxNet(option.id);
    if (!isNeoxRoute.value) {
      Promise.resolve(router.push("/x")).catch(() => {});
    }
    return;
  }

  currentEnv.value = setCurrentEnv(option.id);
  if (isNeoxRoute.value) {
    Promise.resolve(router.push("/homepage")).catch(() => {});
  }
}

// Stay in sync with switches made elsewhere (AppHeader dropdown, other tabs).
function handleNetworkChange(event) {
  if (event?.detail?.neoxNet) {
    currentNeoxNet.value = event.detail.neoxNet;
    return;
  }
  currentEnv.value = event?.detail?.env || getCurrentEnv();
}

onMounted(() => {
  if (typeof window === "undefined") return;
  currentEnv.value = getCurrentEnv();
  currentNeoxNet.value = getNeoxNet();
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});

onBeforeUnmount(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});
</script>
