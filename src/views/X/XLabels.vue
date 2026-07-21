<template>
  <div class="x-labels-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb
          :items="[
            { label: tf('breadcrumb.home', 'Home'), to: '/homepage' },
            { label: 'Neo X', to: '/x' },
            { label: tf('neoX.labels', 'Labels') },
          ]"
        />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-icon-purple text-violet-500">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ tf("pageTitles.xLabels", "Neo X Labels") }}</h1>
            <p class="page-subtitle">
              {{
                tf(
                  "neoX.labelsSubtitle",
                  "Curated directory of official Neo X addresses across governance, bridge, oracle, validator, token, and infrastructure roles"
                )
              }}
            </p>
          </div>
        </div>
      </PageHero>

      <!-- Role sections -->
      <div class="animate-page-enter animate-page-enter-delay-1">
        <section v-for="section in sections" :key="section.role">
          <h2 class="text-high mb-3 mt-6 flex items-center gap-2 text-base font-semibold">
            <span
              class="inline-block h-2 w-2 rounded-full"
              :style="{ background: section.color }"
              aria-hidden="true"
            ></span>
            {{ section.label }}
            <span class="badge-soft">{{ section.entries.length }}</span>
          </h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="entry in section.entries"
              :key="entry.address"
              class="etherscan-card list-row relative p-4"
              :class="{ 'opacity-60': !entry.onCurrentNet }"
            >
              <router-link
                :to="`/x/address/${entry.address}`"
                class="absolute inset-0 rounded-xl"
                :aria-label="entry.label"
              />
              <p class="text-high text-sm font-semibold">{{ entry.label }}</p>
              <div class="mt-1.5 flex items-start gap-1.5">
                <span class="font-hash text-mid break-all text-xs">{{ entry.address }}</span>
                <span class="relative z-10 flex-shrink-0">
                  <CopyButton :text="entry.address" size="xs" />
                </span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span class="badge-soft">{{ networkLabel(entry.network) }}</span>
                <span v-if="!entry.onCurrentNet" class="badge-soft">
                  {{ tf("neoX.otherNetwork", "Other network") }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getNeoxNet, resolveNeoxNetName } from "@/utils/neoxEnv";
import { NEOX_KNOWN_ADDRESSES, NEOX_ROLE_META } from "@/constants/neoxKnownAddresses";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import CopyButton from "@/components/common/CopyButton.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const ROLE_ORDER = ["governance", "bridge", "oracle", "validator", "token", "infra"];

// Same role accent colors as the XHashLink identity dots.
const ROLE_COLORS = {
  bridge: "#38bdf8",
  governance: "#a78bfa",
  oracle: "#fbbf24",
  validator: "var(--status-success)",
  token: "#f59e0b",
  infra: "#94a3b8",
};

const currentNetName = ref(resolveNeoxNetName(getNeoxNet()));
useNetworkChange(() => {
  currentNetName.value = resolveNeoxNetName(getNeoxNet());
});

const sections = computed(() =>
  ROLE_ORDER.map((role) => {
    const entries = NEOX_KNOWN_ADDRESSES.filter((entry) => entry.role === role).map((entry) => ({
      ...entry,
      onCurrentNet: entry.network === "both" || entry.network === currentNetName.value,
    }));
    // Current-network entries first; registry order preserved otherwise.
    entries.sort((a, b) => Number(b.onCurrentNet) - Number(a.onCurrentNet));
    return {
      role,
      label: NEOX_ROLE_META[role]?.label || role,
      color: ROLE_COLORS[role],
      entries,
    };
  }).filter((section) => section.entries.length > 0)
);

function networkLabel(network) {
  if (network === "both") return tf("neoX.networkBoth", "Both networks");
  if (network === "testnet") return tf("neoX.networkTestnet", "Testnet");
  return tf("neoX.networkMainnet", "Mainnet");
}
</script>
