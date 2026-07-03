<template>
  <div class="tool-page animate-page-enter">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.tools'), to: '/tools' }, { label: $t('breadcrumb.storageInspector') }]"
      />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              ></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title neon-glow-text">{{ $t('tools.storageInspector.pageTitle') }}</h1>
            <p class="page-subtitle">{{ $t('tools.storageInspector.pageSubtitle') }}</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6 md:p-8">
        <div class="max-w-3xl mx-auto space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2 md:col-span-2">
              <label class="block text-sm font-semibold text-high">{{ $t('tools.storageInspector.contractHashLabel') }}</label>
              <input
                type="text"
                v-model="contractHash"
                class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-cyan-500/20 hover:border-cyan-400 focus:border-cyan-400 transition-all outline-none"
                :placeholder="$t('tools.storageInspector.contractHashPlaceholder')"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-semibold text-high">{{ $t('tools.storageInspector.storageKeyLabel') }}</label>
              <input
                type="text"
                v-model="storageKey"
                class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-cyan-500/20 hover:border-cyan-400 focus:border-cyan-400 transition-all outline-none"
                :placeholder="$t('tools.storageInspector.storageKeyPlaceholder')"
                @keyup.enter="fetchStorage"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-semibold text-high">{{ $t('tools.storageInspector.keyFormatLabel') }}</label>
              <select
                v-model="keyFormat"
                class="form-input w-full bg-surface text-high text-sm appearance-none rounded-xl shadow-inner focus:ring-2 focus:ring-cyan-500/20 hover:border-cyan-400 focus:border-cyan-400 transition-all outline-none"
              >
                <option value="string">{{ $t('tools.storageInspector.keyFormatString') }}</option>
                <option value="hex">{{ $t('tools.storageInspector.keyFormatHex') }}</option>
                <option value="base64">{{ $t('tools.storageInspector.keyFormatBase64') }}</option>
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-line-soft flex justify-end">
            <button
              @click="fetchStorage"
              :disabled="!isValidInput || isLoading"
              class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
            >
              <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
              {{ isLoading ? $t('tools.storageInspector.querying') : $t('tools.storageInspector.readStorage') }}
            </button>
          </div>

          <!-- Result Area -->
          <transition name="fade">
            <div v-if="hasQueried" class="mt-6 space-y-4">
              <h3 class="text-base font-bold text-high border-b border-line-soft pb-2">{{ $t('tools.storageInspector.storageValue') }}</h3>

              <div
                v-if="!rawBase64Result"
                class="p-6 text-center border border-dashed border-line-soft rounded-xl bg-surface-muted"
              >
                <p class="text-high font-medium">{{ $t('tools.storageInspector.noDataFound') }}</p>
                <p class="text-sm text-mid mt-1">{{ $t('tools.storageInspector.noDataHint') }}</p>
              </div>

              <div v-else class="space-y-4">
                <div class="p-4 rounded-xl border border-line-soft bg-surface">
                  <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">{{ $t('tools.storageInspector.base64Label') }}</p>
                  <p class="text-sm text-high font-mono break-all">{{ rawBase64Result }}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-4 rounded-xl border border-line-soft bg-surface">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">{{ $t('tools.storageInspector.hexLabel') }}</p>
                    <p class="text-sm text-high font-mono break-all">{{ hexResult ? "0x" + hexResult : "" }}</p>
                  </div>

                  <div class="p-4 rounded-xl border border-line-soft bg-surface">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">{{ $t('tools.storageInspector.stringLabel') }}</p>
                    <p class="text-sm text-high font-mono break-all">{{ stringResult || "—" }}</p>
                  </div>

                  <div class="p-4 rounded-xl border border-line-soft bg-surface md:col-span-2">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">{{ $t('tools.storageInspector.integerLabel') }}</p>
                    <p class="text-sm text-high font-mono break-all">{{ intResult }}</p>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";
// RpcClient is resolved lazily to avoid crashes if Neon SDK loads after module evaluation
const hexstring2str = (h) => new TextDecoder().decode(Uint8Array.from(h.match(/../g) || [], b => parseInt(b, 16)));
const reverseHex = (hex) => hex.match(/../g).reverse().join("");
const str2hexstring = (s) => Array.from(new TextEncoder().encode(s), b => b.toString(16).padStart(2, "0")).join("");
import { base642hex } from "@/utils/sdkCompat";
import { loadNeonJs } from "@/utils/neonLoader";
import { getCurrentEnv } from "@/utils/env";
import { callWithRpcEndpointFallback } from "@/utils/rpcEndpoints";

const { t } = useI18n();
const toast = useToast();
const contractHash = ref("");
const storageKey = ref("");
const keyFormat = ref("string");

const isLoading = ref(false);
const hasQueried = ref(false);
const rawBase64Result = ref("");

const isValidInput = computed(() => contractHash.value.trim() && storageKey.value.trim());

const hexResult = computed(() => {
  if (!rawBase64Result.value) return "";
  try {
    return base642hex(rawBase64Result.value);
  } catch (e) {
    return "";
  }
});

const stringResult = computed(() => {
  if (!hexResult.value) return "";
  try {
    return hexstring2str(hexResult.value);
  } catch (e) {
    return "";
  }
});

const intResult = computed(() => {
  if (!hexResult.value) return "0";
  try {
    // Neo VM integers are stored little-endian, two's complement (sign bit
    // is the high bit of the most-significant byte after reversing to BE).
    const h = hexResult.value;
    if (!h) return "0";
    const beHex = reverseHex(h);
    let value = BigInt("0x" + beHex);
    const msb = parseInt(beHex.slice(0, 2), 16);
    if (msb & 0x80) {
      value -= 1n << BigInt(beHex.length * 4);
    }
    return value.toString();
  } catch (e) {
    return t("tools.storageInspector.invalidInteger");
  }
});

async function fetchStorage() {
  if (!isValidInput.value) return;

  isLoading.value = true;
  hasQueried.value = false;
  rawBase64Result.value = "";

  try {
    let keyHex = "";
    if (keyFormat.value === "string") {
      keyHex = str2hexstring(storageKey.value);
    } else if (keyFormat.value === "base64") {
      keyHex = base642hex(storageKey.value);
    } else {
      keyHex = storageKey.value.replace(/^0x/, "");
    }

    const hash = contractHash.value.startsWith("0x") ? contractHash.value : "0x" + contractHash.value;

    // window.Neon isn't reliably populated on a cold tool mount —
    // loadNeonJs resolves the same SDK module the rest of the app uses.
    const sdk = await loadNeonJs();
    const RpcClient = sdk?.rpc?.RPCClient;
    if (typeof RpcClient !== "function") {
      toast.error(t("tools.storageInspector.runtimeUnavailable"));
      return;
    }
    const result = await callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
      const rpcClient = new RpcClient(endpoint);
      // neon-js's getStorage is positional: (scriptHash, key)
      return rpcClient.getStorage(hash, keyHex);
    });
    rawBase64Result.value = result || "";
    hasQueried.value = true;
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.storageInspector.fetchFailedPrefix") + (e.message || t("tools.storageInspector.unknownError")));
  } finally {
    isLoading.value = false;
  }
}
</script>
