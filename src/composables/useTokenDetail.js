import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { tokenService, contractService } from "@/services";
import { useAsync } from "@/composables/useAsync";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/constants";
import { responseConverter } from "@/utils/neoHelpers";
import { invokeContractFunction } from "@/utils/contractInvocation";

/**
 * Shared composable for NEP-17 and NEP-11 token detail views.
 *
 * Encapsulates token loading, contract manifest management, contract
 * invocation, clipboard feedback, and route-driven data refresh.
 *
 * @param {Object}   config
 * @param {string}   config.defaultTab  - Initial active tab key (e.g. "transfers" | "nfts").
 * @param {Array<{key: string, label: string}>} config.tabs - Tab definitions.
 * @param {(info: Object) => void} [config.onTokenLoaded] - Optional callback fired after token data loads.
 * @returns {Object} Reactive state and methods for the token detail view.
 */
export function useTokenDetail({ defaultTab, tabs, onTokenLoaded } = {}) {
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  // ---------------------------------------------------------------------------
  // Reactive state
  // ---------------------------------------------------------------------------
  const tokenId = ref("");
  const manifest = ref({});
  const manifestError = ref(null);
  const decimal = ref("");
  const activeName = ref(defaultTab);
  const updateCounter = ref(0);
  const copied = ref(false);

  // ---------------------------------------------------------------------------
  // Async data fetching via useAsync (handles abort, loading, error, cleanup)
  // ---------------------------------------------------------------------------
  const { data: tokenInfo, loading: tokenLoading, error: tokenError, execute: executeTokenFetch } = useAsync(
    (id, { signal }) => tokenService.getByHash(id, { signal }),
    {
      initialData: {},
      onSuccess: (res) => {
        decimal.value = res?.decimals;
        onTokenLoaded?.(res || {});
      },
      onError: (err) => {
        if (import.meta.env.DEV) console.error("Failed to load token:", err);
      },
    }
  );

  const { execute: executeContractFetch } = useAsync((id, { signal }) => contractService.getByHash(id, { signal }), {
    onSuccess: (res) => {
      try {
        manifest.value = JSON.parse(res?.manifest || "{}");
      } catch {
        manifest.value = {};
      }
      updateCounter.value = res?.updatecounter ?? 0;
      manifestError.value = null;
    },
    onError: (err) => {
      manifestError.value = "Failed to load contract data.";
      if (import.meta.env.DEV) console.warn("Failed to load contract data:", err);
    },
  });

  // Unified loading: true while either fetch is in-flight
  const isLoading = computed(() => tokenLoading.value);

  // Map token error to user-facing message
  const error = computed(() => (tokenError.value ? t("errors.loadTokens") : null));

  // ---------------------------------------------------------------------------
  // Internal timers
  // ---------------------------------------------------------------------------
  let copyTimer = null;

  onBeforeUnmount(() => {
    if (copyTimer) clearTimeout(copyTimer);
  });

  // ---------------------------------------------------------------------------
  // Manifest helpers (immutable update pattern for Vue reactivity)
  // ---------------------------------------------------------------------------

  /**
   * Replace a single method entry inside `manifest` immutably.
   * @param {number} index
   * @param {Object} patch - Properties to merge into the method object.
   */
  function patchMethod(index, patch) {
    const abi = manifest.value?.abi;
    if (!abi?.methods) return;
    const methods = [...abi.methods];
    methods[index] = { ...methods[index], ...patch };
    manifest.value = { ...manifest.value, abi: { ...abi, methods } };
  }

  /** Toggle raw / decoded display for a contract method result. */
  function decode(index) {
    const method = manifest.value?.abi?.methods?.[index];
    if (!method) return;
    patchMethod(index, {
      isRaw: !method.isRaw,
      button: method.isRaw ? "Raw" : "Decode",
    });
  }

  /** Update a single parameter value on a contract method. */
  function onUpdateParam({ methodIndex, paramIndex, value }) {
    const abi = manifest.value?.abi;
    if (!abi?.methods?.[methodIndex]?.parameters) return;
    const methods = [...abi.methods];
    const params = [...methods[methodIndex].parameters];
    params[paramIndex] = { ...params[paramIndex], value };
    methods[methodIndex] = { ...methods[methodIndex], parameters: params };
    manifest.value = { ...manifest.value, abi: { ...abi, methods } };
  }

  /** Invoke a contract method and store the result immutably. */
  function onQuery(index) {
    patchMethod(index, { result: "", error: "" });

    const method = manifest.value?.abi?.methods?.[index];
    if (!method) return;
    invokeContractFunction(tokenId.value, method["name"], method["parameters"])
      .then((res) => {
        if (res?.["exception"] != null) {
          patchMethod(index, { error: res["exception"] });
        } else {
          const stack = Array.isArray(res?.["stack"]) ? res["stack"] : [];
          const temp = JSON.parse(JSON.stringify(stack));
          patchMethod(index, {
            isRaw: true,
            button: "Decode",
            raw: stack,
            display: JSON.parse(JSON.stringify(temp, responseConverter)),
          });
        }
      })
      .catch((err) => {
        patchMethod(index, {
          error: err?.message || err?.toString?.() || "Failed to invoke function",
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Data fetching orchestration
  // ---------------------------------------------------------------------------

  function loadAllData() {
    activeName.value = defaultTab;
    manifest.value = null;
    manifestError.value = null;
    updateCounter.value = 0;
    executeTokenFetch(tokenId.value);
    executeContractFetch(tokenId.value);
  }

  function reloadToken() {
    const hash = route.params.hash;
    if (hash) {
      executeTokenFetch(hash);
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation & clipboard
  // ---------------------------------------------------------------------------

  function getContract(hash) {
    router.push(`/contract-info/${hash}`).catch(() => {});
  }

  function copyHash(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copied.value = true;
        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          copied.value = false;
        }, COPY_FEEDBACK_TIMEOUT_MS);
      })
      .catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Route watcher — drives initial + subsequent loads
  // ---------------------------------------------------------------------------
  watch(
    () => route.params.hash,
    (newHash) => {
      if (newHash) {
        tokenId.value = newHash;
        loadAllData();
      }
    },
    { immediate: true }
  );

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    // state
    tokenId,
    isLoading,
    error,
    tokenInfo,
    manifest,
    manifestError,
    decimal,
    activeName,
    tabs,
    updateCounter,
    copied,

    // methods
    decode,
    onUpdateParam,
    onQuery,
    getContract,
    copyHash,
    reloadToken,
    loadAllData,
  };
}
