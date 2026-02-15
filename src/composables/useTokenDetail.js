import { ref, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { tokenService, contractService } from "@/services";
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
  const isLoading = ref(true);
  const error = ref(null);
  const tokenInfo = ref({});
  const manifest = ref({});
  const manifestError = ref(null);
  const decimal = ref("");
  const activeName = ref(defaultTab);
  const updateCounter = ref(0);
  const copied = ref(false);
  const abortController = ref(null);

  // ---------------------------------------------------------------------------
  // Internal timers
  // ---------------------------------------------------------------------------
  let copyTimer = null;

  onBeforeUnmount(() => {
    if (copyTimer) clearTimeout(copyTimer);
    abortController.value?.abort();
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
    const methods = [...manifest.value["abi"]["methods"]];
    methods[index] = { ...methods[index], ...patch };
    manifest.value = {
      ...manifest.value,
      abi: { ...manifest.value["abi"], methods },
    };
  }

  /** Toggle raw / decoded display for a contract method result. */
  function decode(index) {
    const isRaw = manifest.value["abi"]["methods"][index]["isRaw"];
    patchMethod(index, {
      isRaw: !isRaw,
      button: isRaw ? "Raw" : "Decode",
    });
  }

  /** Update a single parameter value on a contract method. */
  function onUpdateParam({ methodIndex, paramIndex, value }) {
    const methods = [...manifest.value["abi"]["methods"]];
    const params = [...methods[methodIndex]["parameters"]];
    params[paramIndex] = { ...params[paramIndex], value };
    methods[methodIndex] = { ...methods[methodIndex], parameters: params };
    manifest.value = {
      ...manifest.value,
      abi: { ...manifest.value["abi"], methods },
    };
  }

  /** Invoke a contract method and store the result immutably. */
  function onQuery(index) {
    patchMethod(index, { result: "", error: "" });

    const method = manifest.value["abi"]["methods"][index];
    invokeContractFunction(tokenId.value, method["name"], method["parameters"])
      .then((res) => {
        if (abortController.value?.signal.aborted) return;
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
        if (abortController.value?.signal.aborted) return;
        patchMethod(index, {
          error: err?.message || err?.toString?.() || "Failed to invoke function",
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  function getToken(id) {
    error.value = null;
    tokenService
      .getByHash(id, { signal: abortController.value?.signal })
      .then((res) => {
        if (abortController.value?.signal.aborted) return;
        decimal.value = res?.decimals;
        tokenInfo.value = res || {};
        isLoading.value = false;
        onTokenLoaded?.(tokenInfo.value);
      })
      .catch((err) => {
        if (abortController.value?.signal.aborted) return;
        error.value = t("errors.loadTokens");
        isLoading.value = false;
        if (import.meta.env.DEV) console.error("Failed to load token:", err);
      });
  }

  function loadContractData(id) {
    contractService
      .getByHash(id, { signal: abortController.value?.signal })
      .then((res) => {
        if (abortController.value?.signal.aborted) return;
        manifest.value = JSON.parse(res?.manifest || "{}");
        updateCounter.value = res?.updatecounter ?? 0;
        manifestError.value = null;
      })
      .catch((err) => {
        if (abortController.value?.signal.aborted) return;
        manifestError.value = "Failed to load contract data.";
        if (import.meta.env.DEV) console.warn("Failed to load contract data:", err);
      });
  }

  function loadAllData() {
    abortController.value?.abort();
    abortController.value = new AbortController();

    isLoading.value = true;
    activeName.value = defaultTab;
    manifest.value = null;
    manifestError.value = null;
    updateCounter.value = 0;
    getToken(tokenId.value);
    loadContractData(tokenId.value);
  }

  function reloadToken() {
    const hash = route.params.hash;
    if (hash) {
      isLoading.value = true;
      getToken(hash);
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
