<template>
  <footer class="app-footer soft-divider mt-12 border-t backdrop-blur-sm bg-surface-glass">
    <div class="mx-auto max-w-[1400px] px-4 py-10">
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <!-- Brand Column -->
        <div>
          <div class="mb-3 flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated p-1 shadow-sm"
            >
              <img :src="brandLogo" :alt="brandLogoAlt" class="h-full w-full object-contain" />
            </div>
            <span class="text-high text-lg font-extrabold tracking-tight">{{ brandLabel }}</span>
          </div>
          <p class="text-mid mb-4 text-sm leading-relaxed">
            {{ footerDescription }}
          </p>
          <div class="flex items-center gap-3">
            <a
              href="https://github.com/neo-project"
              target="_blank"
              rel="noopener noreferrer"
              class="social-icon"
              :title="$t('aria.githubTitle')"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                />
              </svg>
            </a>
            <a
              href="https://twitter.com/neo_blockchain"
              target="_blank"
              rel="noopener noreferrer"
              class="social-icon"
              title="X (Twitter)"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </a>
            <a href="https://neo.org" target="_blank" rel="noopener noreferrer" class="social-icon" :title="$t('aria.neoOrgTitle')">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                />
              </svg>
            </a>
          </div>
          <div
            class="soft-divider text-mid mt-4 inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs bg-[var(--surface-elevated)]"
          >
            {{ $t("footer.poweredBy") }} <strong class="text-neo-green">{{ chainLabel }}</strong>
          </div>
        </div>

        <!-- Blockchain Column -->
        <div>
          <h3 class="text-high mb-3 text-sm font-semibold uppercase tracking-wide">{{ $t("footer.blockchain") }}</h3>
          <ul class="space-y-2 text-sm">
            <li v-for="link in blockchainLinks" :key="link.to">
              <router-link :to="link.to" class="footer-link">{{ link.label }}</router-link>
            </li>
          </ul>
        </div>

        <!-- Resources Column -->
        <div>
          <h3 class="text-high mb-3 text-sm font-semibold uppercase tracking-wide">{{ $t("footer.resources") }}</h3>
          <ul class="space-y-2 text-sm">
            <li v-for="link in resourceLinks" :key="link.to">
              <router-link :to="link.to" class="footer-link">{{ link.label }}</router-link>
            </li>
          </ul>
        </div>

        <!-- Developers Column -->
        <div>
          <h3 class="text-high mb-3 text-sm font-semibold uppercase tracking-wide">{{ $t("footer.developers") }}</h3>
          <ul class="space-y-2 text-sm">
            <li><router-link to="/api-docs" class="footer-link">{{ $t("nav.apiDocs") }}</router-link></li>
            <li v-if="!isNeoxRoute"><router-link to="/verify-contract/" class="footer-link">{{ $t("nav.verifyContract") }}</router-link></li>
            <li><router-link to="/source-code" class="footer-link">{{ $t("nav.sourceCode") }}</router-link></li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div
        class="soft-divider text-mid mt-8 flex flex-col items-start justify-between gap-3 border-t pt-5 text-xs sm:flex-row sm:items-center"
      >
        <p>&copy; {{ currentYear }} Neo Explorer</p>
        <p class="hidden sm:block">{{ $t("footer.poweredBy") }} <strong class="text-neo-green">{{ dataBackendLabel }}</strong></p>
        <button
          class="text-mid font-medium transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:text-primary-500"
          :aria-label="$t('aria.backToTop')"
          @click="scrollTop"
        >
          {{ $t("footer.backToTop") }} &uarr;
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const route = useRoute();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const isNeoxRoute = computed(() => String(route.path || "").startsWith("/x"));
const chainLabel = computed(() => (isNeoxRoute.value ? "Neo X" : "Neo N3"));
const brandLogo = computed(() => (isNeoxRoute.value ? "/img/brand/neox-mark.svg" : "/img/brand/neo.png"));
const brandLogoAlt = computed(() => (isNeoxRoute.value ? "Neo X logo" : "Neo logo"));
const brandLabel = computed(() => (isNeoxRoute.value ? "Neo X Explorer" : "Neo Explorer"));
const footerDescription = computed(() => {
  if (!isNeoxRoute.value) return t("footer.description");
  return tf(
    "neoX.footerDescription",
    "A Block Explorer and Analytics Platform for Neo X, the EVM-compatible sidechain secured by dBFT consensus."
  );
});
// The bottom-bar credit names the data backend, which differs per chain.
const dataBackendLabel = computed(() => (isNeoxRoute.value ? "Blockscout" : "neo3fura"));

const blockchainLinks = computed(() =>
  isNeoxRoute.value
    ? [
        { to: "/x/blocks", label: t("nav.blocks") },
        { to: "/x/transactions", label: t("nav.transactions") },
        { to: "/x/accounts", label: t("nav.accounts") },
        { to: "/x/contracts", label: t("nav.contracts") },
        { to: "/x/tokens", label: t("nav.tokens") },
      ]
    : [
        { to: "/blocks/1", label: t("nav.blocks") },
        { to: "/transactions/1", label: t("nav.transactions") },
        { to: "/account/1", label: t("nav.accounts") },
        { to: "/contracts/1", label: t("nav.contracts") },
        { to: "/tokens/nep17/1", label: t("nav.tokens") },
      ]
);

const resourceLinks = computed(() =>
  isNeoxRoute.value
    ? [
        { to: "/x/charts", label: t("nav.chartsStats") },
        { to: "/x/anti-mev", label: "Anti-MEV Center" },
        { to: "/x/labels", label: t("nav.labels") },
      ]
    : [
        { to: "/echarts", label: t("nav.chartsStats") },
        { to: "/network-status", label: t("nav.networkStatus") },
        { to: "/gas-tracker", label: t("nav.gasTracker") },
        { to: "/burn", label: t("nav.burnedGas") },
        { to: "/candidates/1", label: t("nav.consensusNodes") },
      ]
);

const currentYear = computed(() => new Date().getFullYear());

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<style scoped>
.social-icon {
  @apply flex h-8 w-8 items-center justify-center rounded-lg border transition;
  border-color: var(--line-soft);
  background: var(--surface-elevated);
  color: var(--text-mid);
}

.social-icon:hover {
  background: var(--link);
  color: white;
  border-color: var(--link);
}
</style>
