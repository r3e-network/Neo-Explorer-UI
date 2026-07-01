import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { tokenService } from "@/services/tokenService";
import { contractService } from "@/services/contractService";
import { useAsync } from "@/composables/useAsync";
import { isAbortError } from "@/utils/abortError";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/constants";
import { responseConverter } from "@/utils/neoHelpers";
import { invokeContractFunction } from "@/utils/contractInvocation";
import { supabaseService } from "@/services/supabaseService";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { resolveNetworkName } from "@/utils/env";
import { copyTextToClipboard } from "@/utils/clipboard";

const TOKEN_DETAIL_LOAD_TIMEOUT_MS = 4500;

function createTimeoutError(timeoutMs) {
  const err = new Error(`Token detail request timed out after ${timeoutMs}ms`);
  err.name = "TimeoutError";
  return err;
}

async function withTimeout(promise, timeoutMs) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createMinimalTokenInfo(id, standard) {
  return {
    hash: id,
    type: standard || "NEP-17",
    totalsupply: null,
    holders: 0,
    decimals: 0,
  };
}

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
 * @param {string} [config.standard] - Optional known token standard, e.g. "NEP11".
 * @returns {Object} Reactive state and methods for the token detail view.
 */
export function useTokenDetail({ defaultTab, tabs, onTokenLoaded, standard = "" } = {}) {
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
  const tokenMetadata = ref(null);

  // ---------------------------------------------------------------------------
  // Async data fetching via useAsync (handles abort, loading, error, cleanup)
  // ---------------------------------------------------------------------------
  const { data: tokenInfo, loading: tokenLoading, error: tokenError, execute: executeTokenFetch } = useAsync(
    async (id, requestOptions = {}, { signal } = {}) => {
      const network = resolveNetworkName(requestOptions.network);
      try {
        return await withTimeout(
          tokenService.getByHashWithFallback(id, { signal, standard, network }),
          TOKEN_DETAIL_LOAD_TIMEOUT_MS,
        );
      } catch (err) {
        if (isAbortError(err)) throw err;
        if (err?.name === "TimeoutError") return createMinimalTokenInfo(id, standard);
        throw err;
      }
    },
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

  const { execute: executeContractFetch } = useAsync(
    (id, requestOptions = {}, { signal } = {}) =>
      contractService.getByHashWithFallback(id, {
        signal,
        network: resolveNetworkName(requestOptions.network),
      }),
    {
    onSuccess: (res) => {
      try {
        if (typeof res?.manifest === "string") {
          manifest.value = JSON.parse(res.manifest || "{}");
        } else if (res?.manifest && typeof res.manifest === "object") {
          manifest.value = res.manifest;
        } else {
          manifest.value = {};
        }
      } catch {
        manifest.value = {};
      }
      updateCounter.value = res?.updatecounter ?? 0;
      manifestError.value = null;
    },
    onError: (err) => {
      // Don't surface aborts (route change, fast-toggle network) as a
      // banner — just clear and let the next load resolve.
      if (isAbortError(err)) return;
      manifestError.value = t("errors.loadContractData");
      if (import.meta.env.DEV) console.warn("Failed to load contract data:", err);
    },
    },
  );

  // Unified loading: true while either fetch is in-flight
  const isLoading = computed(() => tokenLoading.value);

  // Map token error to user-facing message
  const error = computed(() => (tokenError.value ? t("errors.loadTokens") : null));

  // ---------------------------------------------------------------------------
  // Internal timers
  // ---------------------------------------------------------------------------
  let copyTimer = null;

  useNetworkChange(handleNetworkChange);

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
    patchMethod(index, { isRaw: !method.isRaw });
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
    const requestNetwork = resolveNetworkName();
    invokeContractFunction(tokenId.value, method["name"], method["parameters"], null, { network: requestNetwork })
      .then((res) => {
        if (resolveNetworkName() !== requestNetwork) return;
        if (res?.["exception"] != null) {
          patchMethod(index, { error: res["exception"] });
        } else {
          const stack = Array.isArray(res?.["stack"]) ? res["stack"] : [];
          const temp = JSON.parse(JSON.stringify(stack));
          patchMethod(index, {
            isRaw: true,
            raw: stack,
            display: JSON.parse(JSON.stringify(temp, responseConverter)),
          });
        }
      })
      .catch((err) => {
        if (resolveNetworkName() !== requestNetwork) return;
        patchMethod(index, {
          error: err?.message || err?.toString?.() || t("contractDetail.infoFailedToInvoke"),
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Data fetching orchestration
  // ---------------------------------------------------------------------------

    function loadAllData() {
    activeName.value = defaultTab;
    manifest.value = {};
    manifestError.value = null;
    updateCounter.value = 0;
    // Reset metadata so fast token-to-token navigation doesn't flash the
    // previous token's overlay while the next metadata fetch resolves.
    tokenMetadata.value = null;
    const requestNetwork = resolveNetworkName();
    executeTokenFetch(tokenId.value, { network: requestNetwork });
    executeContractFetch(tokenId.value, { network: requestNetwork });

    // Supabase optional metadata fetch — capture the token under
    // resolution so a slower fetch from token A can't overwrite the
    // freshly-set metadata for token B.
    const requestedToken = tokenId.value;
    const requestedNetwork = requestNetwork;
    supabaseService.getContractMetadata(requestedToken, requestedNetwork).then(meta => {
      if (meta && tokenId.value === requestedToken && resolveNetworkName() === requestedNetwork) {
        tokenMetadata.value = meta;
      }
    }).catch(()=>{});
  }

  function reloadToken() {
    const hash = route.params.hash;
    if (hash) {
      executeTokenFetch(hash, { network: resolveNetworkName() });
    }
  }

  function handleNetworkChange() {
    if (tokenId.value) {
      loadAllData();
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation & clipboard
  // ---------------------------------------------------------------------------

  function getContract(hash) {
    router.push(`/contract-info/${hash}`).catch(() => {});
  }

  async function copyHash(text) {
    const copiedOk = await copyTextToClipboard(text);
    if (!copiedOk) return;
    copied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, COPY_FEEDBACK_TIMEOUT_MS);
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
    tokenMetadata,
  };
}
