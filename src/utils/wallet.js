import { useToast } from "vue-toastification";
import { PROVIDERS } from "@/constants/walletProviders";
import { loadWalletService } from "@/utils/lazyServices";
import { clearWalletState, connectedAccount } from "@/utils/walletState";
import i18n from "@/lang/i18n";

const t = (key, ...args) => i18n.global.t(key, ...args);
const NEO_TOKEN_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const PASSIVE_DAPI_RESTORE_VALIDATION = Object.freeze({
  allowSwitch: false,
  verifyAccount: false,
});

function getStoredWalletAddress() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("connectedWallet") || localStorage.getItem("connectedWallet") || "";
}

export { connectedAccount };

function clearStoredWalletState() {
  clearWalletState();
  if (typeof window === "undefined") return;
  localStorage.removeItem("connectedWallet");
  localStorage.removeItem("walletProvider");
  sessionStorage.removeItem("connectedWallet");
  sessionStorage.removeItem("walletProvider");
  sessionStorage.removeItem("devTestWif");
}

function clearRestoredWalletState(walletService) {
  clearStoredWalletState();
  try {
    walletService?.disconnect?.();
  } catch {
    // Best-effort cleanup for partially restored sessions.
  }
}

function setStoredWalletAddress(provider, address) {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem("walletProvider") === provider) {
    sessionStorage.setItem("connectedWallet", address);
    return;
  }
  localStorage.setItem("connectedWallet", address);
}

function getStoredWalletProvider() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("walletProvider") || localStorage.getItem("walletProvider");
}

function isNeoLineSessionActive() {
  return getStoredWalletProvider() === PROVIDERS.NEOLINE;
}

let _neoLineListenersSetup = false;
function setupNeoLineEventListeners() {
  if (typeof window === "undefined" || _neoLineListenersSetup) return;
  _neoLineListenersSetup = true;

  const handleAccountChange = async (data) => {
    if (!isNeoLineSessionActive()) return;

    if (data && data.detail && data.detail.address) {
      const newAddress = data.detail.address;
      connectedAccount.value = newAddress;
      localStorage.setItem("connectedWallet", newAddress);
      // walletService caches its own _account.address used for signer
      // derivation in invoke(). Keep it in lockstep with connectedAccount
      // — otherwise after a NeoLine account switch the next invoke would
      // ask the wallet to sign for the previous account, which the wallet
      // ignores and the explorer can't tell why the request failed.
      let walletService = null;
      try {
        walletService = await loadWalletService();
        walletService.hydrateSession(PROVIDERS.NEOLINE, {
          address: newAddress,
          label: PROVIDERS.NEOLINE,
        });
        await walletService.ensureNetworkConsistency?.({ allowSwitch: true });
      } catch {
        clearRestoredWalletState(walletService);
      }
    } else {
      connectedAccount.value = "";
      localStorage.removeItem("connectedWallet");
      try {
        const walletService = await loadWalletService();
        walletService.disconnect();
      } catch {
        // Best-effort cleanup.
      }
    }
  };

  window.addEventListener("NEOLine.NEO.EVENT.ACCOUNT_CHANGED", handleAccountChange);
  window.addEventListener("NEOLine.N3.EVENT.ACCOUNT_CHANGED", handleAccountChange);
}

export async function initWallet() {
  if (typeof window === "undefined") return;

  const storedAddress = getStoredWalletAddress();
  const provider = getStoredWalletProvider();
  if (!storedAddress || !provider) {
    clearStoredWalletState();
    return;
  }

  // Passive restore only. Do not call interactive wallet APIs during app boot.
  connectedAccount.value = "";
  const walletService = await loadWalletService();
  const restoreAttemptId = typeof walletService.beginPassiveRestore === "function"
    ? walletService.beginPassiveRestore()
    : null;
  const restoreAttemptOptions = (options) => ({
    ...(options || {}),
    connectionAttemptId: restoreAttemptId,
  });
  const hydrateRestoredSession = (providerName, account) => {
    if (Number.isFinite(restoreAttemptId)) {
      walletService.hydrateSession(providerName, account, restoreAttemptOptions());
      return;
    }
    walletService.hydrateSession(providerName, account);
  };
  const restoreWalletSession = (providerName, options) => (
    Number.isFinite(restoreAttemptId)
      ? walletService.restoreSession(providerName, restoreAttemptOptions(options))
      : options === undefined
        ? walletService.restoreSession(providerName)
        : walletService.restoreSession(providerName, options)
  );
  const isRestoreAttemptCurrent = () => (
    !Number.isFinite(restoreAttemptId) ||
    typeof walletService.isConnectionAttemptCurrent !== "function" ||
    walletService.isConnectionAttemptCurrent(restoreAttemptId)
  );
  const handleRestoreError = (error) => {
    if (
      typeof walletService.isConnectionSupersededError === "function" &&
      walletService.isConnectionSupersededError(error)
    ) {
      return;
    }
    if (!isRestoreAttemptCurrent()) return;
    clearRestoredWalletState(walletService);
  };

  if (provider === "NeoLine") {
    // 3s matches the timeout used by the interactive connect path in
    // walletService — NeoLine sometimes takes >1s to inject on a cold
    // reload, and the prior 1s window dropped sessions we could keep.
    const hasNeoLine = await waitForNeoLineN3(3000);
    if (!isRestoreAttemptCurrent()) return;
    if (!hasNeoLine) {
      clearStoredWalletState();
      return;
    }

    try {
      setupNeoLineEventListeners();
      hydrateRestoredSession(PROVIDERS.NEOLINE, {
        address: storedAddress,
        label: PROVIDERS.NEOLINE,
      });
      await walletService.ensureNetworkConsistency?.(PASSIVE_DAPI_RESTORE_VALIDATION);
      if (!isRestoreAttemptCurrent()) return;
      connectedAccount.value = storedAddress;
      setStoredWalletAddress(PROVIDERS.NEOLINE, storedAddress);
    } catch (e) {
      handleRestoreError(e);
    }
  } else if (provider === PROVIDERS.ONEGATE) {
    if (!window.OneGate && !window.neo) {
      clearStoredWalletState();
      return;
    }

    try {
      hydrateRestoredSession(PROVIDERS.ONEGATE, {
        address: storedAddress,
        label: PROVIDERS.ONEGATE,
      });
      await walletService.ensureNetworkConsistency?.(PASSIVE_DAPI_RESTORE_VALIDATION);
      if (!isRestoreAttemptCurrent()) return;
      connectedAccount.value = storedAddress;
      setStoredWalletAddress(PROVIDERS.ONEGATE, storedAddress);
    } catch (e) {
      handleRestoreError(e);
    }
  } else if (provider === PROVIDERS.WALLETCONNECT) {
    try {
      const account = await restoreWalletSession(PROVIDERS.WALLETCONNECT);
      if (!isRestoreAttemptCurrent()) return;
      if (account && account.address) {
        connectedAccount.value = account.address;
        setStoredWalletAddress(PROVIDERS.WALLETCONNECT, account.address);
      } else {
        clearRestoredWalletState(walletService);
      }
    } catch (e) {
      handleRestoreError(e);
    }
  } else if (provider === PROVIDERS.EVM_WALLET) {
    clearRestoredWalletState(walletService);
  } else if (provider === PROVIDERS.TESTNET_WIF) {
    try {
      const wif = sessionStorage.getItem("devTestWif") || "";
      if (!wif) {
        clearRestoredWalletState(walletService);
        return;
      }
      const account = await restoreWalletSession(PROVIDERS.TESTNET_WIF, { wif });
      if (!isRestoreAttemptCurrent()) return;
      if (account && account.address) {
        connectedAccount.value = account.address;
        sessionStorage.setItem("connectedWallet", account.address);
      } else {
        clearRestoredWalletState(walletService);
      }
    } catch (e) {
      handleRestoreError(e);
    }
  } else if (provider === PROVIDERS.NEON) {
    try {
      const account = await restoreWalletSession(PROVIDERS.NEON);
      if (!isRestoreAttemptCurrent()) return;
      if (account && account.address) {
        connectedAccount.value = account.address;
        localStorage.setItem("connectedWallet", account.address);
      } else {
        clearRestoredWalletState(walletService);
      }
    } catch (e) {
      handleRestoreError(e);
    }
  } else if (provider === PROVIDERS.WEB3AUTH) {
    try {
      const account = await restoreWalletSession(PROVIDERS.WEB3AUTH);
      if (!isRestoreAttemptCurrent()) return;
      if (account && account.address) {
        connectedAccount.value = account.address;
        setStoredWalletAddress(PROVIDERS.WEB3AUTH, account.address);
      } else {
        clearRestoredWalletState(walletService);
      }
    } catch (e) {
      handleRestoreError(e);
    }
  } else {
    clearRestoredWalletState(walletService);
  }
}

function waitForNeoLineN3(timeout = 3000) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.NEOLineN3) {
      resolve(true);
      return;
    }

    const onReady = () => {
      cleanup();
      resolve(Boolean(window.NEOLineN3));
    };

    const cleanup = () => {
      window.removeEventListener("NEOLine.NEO.EVENT.READY", onReady);
      window.removeEventListener("NEOLine.N3.EVENT.READY", onReady);
      clearTimeout(timer);
    };

    window.addEventListener("NEOLine.NEO.EVENT.READY", onReady);
    window.addEventListener("NEOLine.N3.EVENT.READY", onReady);

    const timer = setTimeout(() => {
      cleanup();
      resolve(Boolean(window.NEOLineN3));
    }, timeout);
  });
}

export async function connectWallet() {
  const toast = useToast();
  const hasNeoLine = await waitForNeoLineN3();
  if (!hasNeoLine) {
    toast.warning(t('wallet.notFound'));
    return null;
  }

  try {
    setupNeoLineEventListeners();
    const walletService = await loadWalletService();
    const account = await walletService.connect(PROVIDERS.NEOLINE);
    if (!account?.address) {
      toast.warning(t('wallet.noAccount'));
      return null;
    }

    connectedAccount.value = account.address;
    toast.success(t('wallet.connected', account.address.slice(0, 5) + "..." + account.address.slice(-4)));
    return account.address;
  } catch (e) {
    if (import.meta.env.DEV) console.error("Wallet connection failed", e);
    toast.error(t('wallet.connectFailed', e.message || "Unknown error"));
    return null;
  }
}

export async function disconnectWallet() {
  clearStoredWalletState();
}

async function loadVoteHelpers() {
  const normalization = await import("@/utils/walletNormalization");

  return {
    isHash160Hex: normalization.isHash160Hex,
    normalizeHash160: normalization.normalizeHash160,
    neoHash: NEO_TOKEN_HASH,
  };
}

async function submitVote(candidatePubkey = null) {
  const toast = useToast();
  const walletService = await loadWalletService();
  if (!walletService.isConnected) {
    toast.error(t('wallet.connectFirst'));
    return;
  }

  const voterAddress = connectedAccount.value || walletService.account?.address;
  if (!voterAddress) {
    toast.error(t('wallet.addressUnavailable'));
    return;
  }

  const { isHash160Hex, normalizeHash160, neoHash } = await loadVoteHelpers();
  const voterHash160 = normalizeHash160(voterAddress);
  if (!isHash160Hex(voterHash160)) {
    toast.error(t('wallet.addressInvalid'));
    return;
  }

  try {
    const voteTargetArg = candidatePubkey
      ? { type: "PublicKey", value: candidatePubkey }
      : { type: "Any", value: null };

    const result = await walletService.invoke({
      scriptHash: neoHash,
      operation: "vote",
      args: [{ type: "Hash160", value: voterHash160 }, voteTargetArg],
      signers: [{ account: voterHash160, scopes: 1 }],
      scope: 1,
    });

    toast.success(t('wallet.voteSubmitted', candidatePubkey ? "Vote" : "Unvote", result.txid));
    return result.txid;
  } catch (e) {
    if (import.meta.env.DEV) console.error("[wallet] vote failed:", e);
    toast.error(
      t('wallet.voteFailed', candidatePubkey ? "Voting" : "Unvoting", e.message || e.description || "Unknown error"),
    );
    throw e;
  }
}

export async function voteForCandidate(candidatePubkey) {
  return submitVote(candidatePubkey);
}

export async function unvoteCandidate() {
  return submitVote(null);
}

export async function invokeContract(scriptHash, operation, args, signers) {
  const walletService = await loadWalletService();
  if (!walletService.isConnected) {
    throw new Error(t('wallet.notConnected'));
  }

  const result = await walletService.invoke({
    scriptHash,
    operation,
    args,
    signers,
  });
  return result.txid;
}
