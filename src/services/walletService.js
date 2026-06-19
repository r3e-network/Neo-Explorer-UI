/**
 * Wallet Service — Neo wallet integration for Neo N3
 * @module services/walletService
 * @description Detects browser wallet extensions and provides invoke/sign capabilities
 */

import { loadNeonJs } from "@/utils/neonLoader";
import { WALLET_STATE_EVENT } from "@/constants/walletEvents";
import { clearWalletState, setWalletState } from "@/utils/walletState";
function hexToBytes(hex) {
  const h = String(hex || "").replace(/^0x/i, "");
  return Uint8Array.from(h.match(/../g) || [], (b) => parseInt(b, 16));
}
import { PROVIDERS } from "@/constants/walletProviders";

function tWallet(key, params, fallback) {
  const i18n = typeof globalThis !== "undefined" ? globalThis.__neoExplorerI18n__ : null;
  if (i18n?.global?.t) {
    const translated = i18n.global.t(key, params || {});
    if (translated && translated !== key) return translated;
  }
  return fallback;
}

import { getCurrentEnv } from "@/utils/env";
import { callWithRpcEndpointFallback } from "@/utils/rpcEndpoints";
import {
  isHash160Hex,
  normalizeHash160,
  normalizeInvokeArgsForRpc,
  normalizeSignersForRpc,
  normalizeSignMessageResult,
} from "@/utils/walletNormalization";
import { bytesToHex, publicKeyToAddress } from "@/utils/neoHelpers";
import { decodeUnsignedTransaction } from "@/utils/unsignedTransaction";
import { buildContractParam } from "@/utils/contractParam";
import aaMethodPolicy from "@/constants/aaMethodPolicy.json";

/** Internal state */
let _connectedProvider = null;
let _account = null;
let _neolineN3 = null;
let _directWifAccount = null;
let _networkError = "";
let _connectionAttemptId = 0;

// EIP-1193 listener bookkeeping. We hold references so we can detach them
// cleanly on disconnect (window.ethereum survives the wallet session).
let _evmAccountsChangedHandler = null;
let _evmChainChangedHandler = null;

function detachEvmListeners() {
  if (typeof window === "undefined" || !window.ethereum) return;
  if (_evmAccountsChangedHandler && typeof window.ethereum.removeListener === "function") {
    try { window.ethereum.removeListener("accountsChanged", _evmAccountsChangedHandler); } catch { /* noop */ }
  }
  if (_evmChainChangedHandler && typeof window.ethereum.removeListener === "function") {
    try { window.ethereum.removeListener("chainChanged", _evmChainChangedHandler); } catch { /* noop */ }
  }
  _evmAccountsChangedHandler = null;
  _evmChainChangedHandler = null;
}

function attachEvmListeners() {
  if (typeof window === "undefined" || !window.ethereum || typeof window.ethereum.on !== "function") return;
  detachEvmListeners();
  _evmAccountsChangedHandler = (accounts) => {
    // Empty array = wallet locked or all accounts disconnected.
    // Different address = user switched accounts mid-session; the cached
    // pubkey + derived AA address are now stale, so disconnect cleanly
    // rather than leave the user with an unsignable session.
    const next = Array.isArray(accounts) && accounts[0] ? String(accounts[0]).toLowerCase() : "";
    const current = _account?.evmAddress || "";
    if (!next || next !== current) {
      walletService.disconnect();
    }
  };
  _evmChainChangedHandler = () => {
    // Network change invalidates assumptions about which Neo network the
    // EVM identity maps to — disconnect.
    walletService.disconnect();
  };
  window.ethereum.on("accountsChanged", _evmAccountsChangedHandler);
  window.ethereum.on("chainChanged", _evmChainChangedHandler);
}

export { WALLET_STATE_EVENT };

function persistWalletState(detail) {
  if (typeof window === "undefined") return;

  const clearPersisted = () => {
    localStorage.removeItem("connectedWallet");
    localStorage.removeItem("walletProvider");
    sessionStorage.removeItem("connectedWallet");
    sessionStorage.removeItem("walletProvider");
    sessionStorage.removeItem("devTestWif");
  };

  if (!detail.connected || !detail.account?.address || !detail.provider) {
    clearPersisted();
    return;
  }

  if (
    detail.provider === PROVIDERS.EVM_WALLET ||
    detail.provider === PROVIDERS.TESTNET_WIF ||
    detail.account?.persistSession === false
  ) {
    clearPersisted();
    return;
  }

  if (detail.account?.persistSession === "session") {
    localStorage.removeItem("connectedWallet");
    localStorage.removeItem("walletProvider");
    sessionStorage.setItem("connectedWallet", detail.account.address);
    sessionStorage.setItem("walletProvider", detail.provider);
    return;
  }

  sessionStorage.removeItem("connectedWallet");
  sessionStorage.removeItem("walletProvider");
  sessionStorage.removeItem("devTestWif");
  localStorage.setItem("connectedWallet", detail.account.address);
  localStorage.setItem("walletProvider", detail.provider);
}

function broadcastWalletStateChange() {
  const detail = {
    connected: !!_account,
    provider: _connectedProvider,
    account: _account ? { ...(_account || {}) } : null,
    networkError: _networkError,
  };
  if (detail.connected) setWalletState(detail);
  else clearWalletState();
  persistWalletState(detail);

  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(WALLET_STATE_EVENT, { detail }));
  } catch {
    // CustomEvent may not be available in some non-browser environments — best-effort only.
  }
}

function beginConnectionAttempt() {
  _connectionAttemptId += 1;
  return _connectionAttemptId;
}

function isCurrentConnectionAttempt(attemptId) {
  return attemptId === _connectionAttemptId;
}

function assertCurrentConnectionAttempt(attemptId) {
  if (!isCurrentConnectionAttempt(attemptId)) {
    throw createConnectionSupersededError();
  }
}

const AA_ALLOWED_META_METHODS = new Set(
  Array.isArray(aaMethodPolicy?.allowedMethods) ? aaMethodPolicy.allowedMethods : [],
);
const NEOLINE_APPROVAL_TIMEOUT_MS = 60_000;
const CONNECTION_SUPERSEDED_CODE = "WALLET_CONNECTION_SUPERSEDED";

function createConnectionSupersededError() {
  const error = new Error(
    tWallet(
      "wallet.errors.connectionSuperseded",
      null,
      "Wallet connection was canceled or superseded by a newer request.",
    ),
  );
  error.code = CONNECTION_SUPERSEDED_CODE;
  return error;
}

async function assertWalletConnectAttemptCurrent(connectionAttemptId, walletConnectService) {
  try {
    assertCurrentConnectionAttempt(connectionAttemptId);
  } catch (error) {
    if (error?.code === CONNECTION_SUPERSEDED_CODE) {
      try {
        await walletConnectService?.disconnect?.();
      } catch {
        // Best-effort cleanup; stale restores must not keep a background session.
      }
    }
    throw error;
  }
}

async function loadSdk() {
  const sdk = await loadNeonJs();
  if (!sdk) throw new Error("neon-js is not available.");
  return sdk;
}

async function getSdkTools() {
  const sdk = await loadSdk();
  return {
    ScriptBuilder: sdk.sc.ScriptBuilder,
    hash160: sdk.u.hash160,
    num2hexstring: sdk.u.num2hexstring,
    reverseHex: sdk.u.reverseHex,
    str2hexstring: sdk.u.str2hexstring,
  };
}

function getCompatTransactionClass(sdk) {
  return sdk?.tx?.Transaction;
}

let walletConnectServicePromise = null;
let web3authServicePromise = null;
let walletConnectSessionUnsubscribe = null;

async function loadWalletConnectService() {
  if (!walletConnectServicePromise) {
    walletConnectServicePromise = import("./walletConnectService").then((module) => module.walletConnectService);
  }
  return walletConnectServicePromise;
}

async function loadWalletConnectServiceWithSessionSync() {
  const walletConnectService = await loadWalletConnectService();
  if (!walletConnectSessionUnsubscribe && typeof walletConnectService.onSessionChange === "function") {
    walletConnectSessionUnsubscribe = walletConnectService.onSessionChange((event = {}) => {
      if (_connectedProvider !== PROVIDERS.WALLETCONNECT && _connectedProvider !== PROVIDERS.NEON) return;

      if (!event.connected || event.error || !event.account?.address) {
        _networkError = event.error?.message || "";
        _connectedProvider = null;
        _account = null;
        broadcastWalletStateChange();
        return;
      }

      _account = {
        ...event.account,
        label: _connectedProvider,
      };
      _networkError = "";
      broadcastWalletStateChange();
    });
  }
  return walletConnectService;
}

async function loadWeb3authService() {
  if (!web3authServicePromise) {
    web3authServicePromise = import("./web3authService").then((module) => module.web3authService);
  }
  return web3authServicePromise;
}

function isDirectWifProviderEnabled() {
  return Boolean(import.meta.env.DEV);
}

/**
 * Check if NeoLine extension is available.
 * NeoLine injects `window.NEOLine` and `window.NEOLineN3` after page load.
 */
function hasNeoLineLegacyApi() {
  return typeof window !== "undefined" && window.NEOLine !== undefined;
}

function hasNeoLineN3Api() {
  return typeof window !== "undefined" && window.NEOLineN3 !== undefined;
}

function isNeoLineAvailable() {
  return hasNeoLineLegacyApi() || hasNeoLineN3Api();
}

function unwrapNeoDapiProvider(candidate) {
  if (!candidate) return null;
  if (typeof candidate.getAccount === "function") return candidate;
  if (candidate.neo3Dapi && typeof candidate.neo3Dapi.getAccount === "function") {
    return candidate.neo3Dapi;
  }
  return null;
}

function getOneGateDapi() {
  if (typeof window === "undefined") return null;
  return unwrapNeoDapiProvider(window.OneGate) || unwrapNeoDapiProvider(window.neo);
}

function isOneGateAvailable() {
  return !!getOneGateDapi();
}

function getWalletConnectProjectId() {
  return String(import.meta.env.VITE_WC_PROJECT_ID || "").trim();
}

function isWalletConnectConfigured() {
  return !!getWalletConnectProjectId();
}

function getWeb3AuthClientId() {
  return String(import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "").trim();
}

function isWeb3AuthConfigured() {
  return !!getWeb3AuthClientId();
}

/**
 * Check if an EVM Wallet is available.
 */
function isEthereumAvailable() {
  return typeof window !== "undefined" && window.ethereum !== undefined;
}

async function readEvmAccounts() {
  if (!isEthereumAvailable() || typeof window.ethereum.request !== "function") return [];
  let accounts = [];
  try {
    accounts = await window.ethereum.request({ method: "eth_accounts" });
  } catch {
    return [];
  }
  if (!Array.isArray(accounts)) return [];
  return accounts.map((account) => String(account || "").trim().toLowerCase()).filter(Boolean);
}

function getEvmAccountUnavailableError() {
  return new Error(
    tWallet(
      "wallet.errors.evmAccountUnavailable",
      null,
      "EVM wallet account is no longer available. Unlock or reconnect your EVM wallet.",
    ),
  );
}

function getEvmAccountChangedError() {
  return new Error(
    tWallet(
      "wallet.errors.evmAccountChanged",
      null,
      "EVM wallet account changed. Reconnect the wallet before signing.",
    ),
  );
}

async function ensureConnectedEvmAccountStillActive() {
  if (_connectedProvider !== PROVIDERS.EVM_WALLET || !_account?.evmAddress) return true;
  if (!isEthereumAvailable()) {
    const error = new Error(tWallet("wallet.errors.evmWalletNotInstalled", null, "EVM Wallet is not installed."));
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  const accounts = await readEvmAccounts();
  const activeAddress = accounts[0] || "";
  const expectedAddress = String(_account.evmAddress || "").trim().toLowerCase();

  if (!activeAddress) {
    const error = getEvmAccountUnavailableError();
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  if (activeAddress !== expectedAddress) {
    const error = getEvmAccountChangedError();
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  return true;
}

function assertEvmAddressMatchesConnectedWallet(address) {
  if (_connectedProvider !== PROVIDERS.EVM_WALLET) return true;
  const expectedAddress = String(_account?.evmAddress || "").trim().toLowerCase();
  const actualAddress = String(address || "").trim().toLowerCase();
  if (expectedAddress && actualAddress === expectedAddress) return true;

  const error = getEvmAccountChangedError();
  _networkError = error.message;
  broadcastWalletStateChange();
  throw error;
}

/**
 * Get the NeoLine N3 dapi instance.
 * NeoLine exposes N3 API via `new window.NEOLineN3.Init()`.
 */
async function getNeoLineN3() {
  if (_neolineN3) return _neolineN3;
  if (!hasNeoLineN3Api()) throw new Error(tWallet("wallet.errors.neoLineNotDetected", null, "NeoLine extension not detected"));
  _neolineN3 = await new window.NEOLineN3.Init();
  return _neolineN3;
}


/**
 * Wait for NeoLine to be ready (it injects after DOMContentLoaded).
 * @param {number} timeout - Max wait in ms
 * @returns {Promise<boolean>}
 */
function waitForNeoLine(timeout = 3000) {
  return new Promise((resolve) => {
    if (isNeoLineAvailable()) return resolve(true);

    const handler = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      window.removeEventListener("NEOLine.NEO.EVENT.READY", handler);
      window.removeEventListener("NEOLine.N3.EVENT.READY", handler);
    };

    window.addEventListener("NEOLine.NEO.EVENT.READY", handler);
    window.addEventListener("NEOLine.N3.EVENT.READY", handler);
    setTimeout(() => {
      cleanup();
      resolve(isNeoLineAvailable());
    }, timeout);
  });
}

function isExplorerTestnet() {
  const env = getCurrentEnv().toLowerCase();
  return env.includes("test") || env.includes("t5");
}

function getExplorerNetworkMode() {
  return isExplorerTestnet() ? "testnet" : "mainnet";
}

function normalizeWalletNetworkMode(network) {
  const walletNetwork = String(network || "").trim().toLowerCase();
  if (!walletNetwork) return "";
  if (walletNetwork.includes("test") || walletNetwork.includes("t5")) return "testnet";
  if (walletNetwork.includes("main")) return "mainnet";
  return "";
}

function isWalletNetworkCompatible(network) {
  const walletMode = normalizeWalletNetworkMode(network);
  return !walletMode || walletMode === getExplorerNetworkMode();
}

function isKnownWalletNetwork(network) {
  return Boolean(normalizeWalletNetworkMode(network));
}

function getDapiNetworkName() {
  return isExplorerTestnet() ? "N3TestNet" : "N3MainNet";
}

function getLegacyDapiNetworkAlias() {
  return isExplorerTestnet() ? "TestNet" : "MainNet";
}

function getWalletNetworkMismatchError(walletNetwork) {
  const explorerNetwork = getCurrentEnv();
  const walletLabel = walletNetwork ? ` Wallet is on ${walletNetwork}.` : "";
  return new Error(
    tWallet(
      "wallet.errors.networkMismatchSwitch",
      { env: explorerNetwork },
      `Network mismatch.${walletLabel} Switch your wallet to ${explorerNetwork} and try again.`,
    ),
  );
}

function getWalletNetworkUnknownError(providerName) {
  return new Error(
    tWallet(
      "wallet.errors.networkUnknown",
      { provider: providerName || "Wallet" },
      `${providerName || "Wallet"} did not report its active network. Reconnect or switch the wallet network and try again.`,
    ),
  );
}

function getWalletAccountUnavailableError(providerName) {
  return new Error(
    tWallet(
      "wallet.errors.walletAccountUnavailable",
      { provider: providerName || "Wallet" },
      `${providerName || "Wallet"} did not report an active account. Unlock or reconnect the wallet and try again.`,
    ),
  );
}

function getWalletAccountChangedError(providerName) {
  return new Error(
    tWallet(
      "wallet.errors.walletAccountChanged",
      { provider: providerName || "Wallet" },
      `${providerName || "Wallet"} account changed. Reconnect or switch the wallet account from the Explorer before signing.`,
    ),
  );
}

async function readDapiNetwork(dapi) {
  if (!dapi || typeof dapi.getNetworks !== "function") return "";
  try {
    const networks = await dapi.getNetworks();
    return String(networks?.defaultNetwork || "").trim();
  } catch {
    return "";
  }
}

async function ensureDapiNetworkCompatible(dapi, { switchTarget, allowSwitch = true, requireKnownNetwork = false, providerName = "" } = {}) {
  let walletNetwork = await readDapiNetwork(dapi);
  if (isKnownWalletNetwork(walletNetwork) && isWalletNetworkCompatible(walletNetwork)) {
    _networkError = "";
    return true;
  }

  if (allowSwitch && typeof dapi?.switchNetwork === "function") {
    const target = isExplorerTestnet() ? switchTarget?.testnet : switchTarget?.mainnet;
    if (target) {
      try {
        await dapi.switchNetwork({ network: target });
        walletNetwork = await readDapiNetwork(dapi);
      } catch (e) {
        if (import.meta.env.DEV) console.warn("Auto-switch wallet network failed:", e);
      }
    }
  }

  if (requireKnownNetwork && !isKnownWalletNetwork(walletNetwork)) {
    const error = getWalletNetworkUnknownError(providerName);
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  if (!isWalletNetworkCompatible(walletNetwork)) {
    const error = getWalletNetworkMismatchError(walletNetwork);
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  _networkError = "";
  broadcastWalletStateChange();
  return true;
}

async function readDapiAccount(dapi, providerName) {
  if (!dapi || typeof dapi.getAccount !== "function") {
    const error = getWalletAccountUnavailableError(providerName);
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  let account = null;
  try {
    account = await dapi.getAccount();
  } catch (err) {
    if (isDapiCanceled(err)) {
      throw new Error(tWallet("wallet.errors.connectionCanceled", null, "Connection canceled by user."));
    }
    const error = toReadableWalletError(err, getWalletAccountUnavailableError(providerName).message);
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  if (!account?.address) {
    const error = getWalletAccountUnavailableError(providerName);
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  return account;
}

async function ensureConnectedDapiAccountStillActive(dapi, providerName) {
  if (!_account?.address) return true;
  const account = await readDapiAccount(dapi, providerName);
  const expectedAddress = String(_account.address || "").trim();
  const actualAddress = String(account.address || "").trim();
  if (expectedAddress && actualAddress === expectedAddress) return true;

  const error = getWalletAccountChangedError(providerName);
  _networkError = error.message;
  broadcastWalletStateChange();
  throw error;
}

function syncConnectedWalletConnectAccount(walletConnectService, providerName) {
  if (!_account?.address) return true;
  const account = walletConnectService?.account;
  if (!account?.address) {
    const error = getWalletAccountUnavailableError(providerName);
    _networkError = error.message;
    broadcastWalletStateChange();
    throw error;
  }

  const expectedAddress = String(_account.address || "").trim();
  const actualAddress = String(account.address || "").trim();
  if (expectedAddress && actualAddress === expectedAddress) return true;

  _account = {
    ...account,
    label: providerName,
  };
  _networkError = "";
  broadcastWalletStateChange();
  return true;
}

export function getAbstractAccountHash() {
  const env = isExplorerTestnet() ? "TESTNET" : "MAINNET";
  const candidate =
    env === "TESTNET"
      ? import.meta.env.VITE_AA_HASH_TESTNET || import.meta.env.VITE_AA_HASH
      : import.meta.env.VITE_AA_HASH_MAINNET || import.meta.env.VITE_AA_HASH;

  const normalized = normalizeHash160(candidate);
  return isHash160Hex(normalized) ? normalized : "";
}

async function deriveEvmNeoAddressFromPublicKey(uncompressedPubKey) {
  const aaHash = getAbstractAccountHash();
  if (!aaHash) {
    throw new Error("Abstract account contract hash is not configured (VITE_AA_HASH_*).");
  }

  const { ScriptBuilder, hash160, reverseHex } = await getSdkTools();
  const sb = new ScriptBuilder();
  sb.emitContractCall(aaHash, "verify", undefined, [hexToBytes(uncompressedPubKey)]);
  const verifyScript = sb.toBytes();
  const scriptHash = reverseHex(hash160(verifyScript));
  const { scriptHashToAddress } = await import("@/utils/neoHelpers");
  return scriptHashToAddress(scriptHash);
}

function assertAllowedAaMetaMethod(operation) {
  const method = String(operation || "").trim();
  if (!method) {
    throw new Error("Missing method for abstract account relay call.");
  }
  if (!AA_ALLOWED_META_METHODS.has(method)) {
    throw new Error(`Method not allowed by abstract account policy: ${method}`);
  }
  return method;
}

function getWalletErrorMessage(err) {
  if (!err) return "";
  if (typeof err === "string") return err;

  const candidates = [
    err.description,
    err.message,
    err.error?.description,
    err.error?.message,
    err.data?.description,
    err.data?.message,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function toReadableWalletError(err, fallbackMessage) {
  if (err instanceof Error && err.message?.trim()) return err;

  const message = getWalletErrorMessage(err);
  return new Error(message || fallbackMessage);
}

function isDapiConnectionDenied(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = getWalletErrorMessage(err).toLowerCase();
  return type === "CONNECTION_DENIED" || /refused to process this request|connection denied/.test(msg);
}

function isDapiCanceled(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = getWalletErrorMessage(err).toLowerCase();
  return type === "CANCELED" || /user canceled|canceled/.test(msg);
}

function shouldRetryWithLegacyDapiNetwork(err, expectedNetwork, legacyNetworkAlias) {
  if (legacyNetworkAlias === expectedNetwork) return false;
  if (isDapiConnectionDenied(err) || isDapiCanceled(err)) return false;
  return true;
}

function toConnectionDeniedError(providerName) {
  return new Error(
    `${providerName} refused this request. Open ${providerName}, unlock it, approve this site, and retry.`,
  );
}

function requestNeoLineAccount(n3, timeoutMs = NEOLINE_APPROVAL_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let pendingConnectionDenied = false;

    const cleanup = () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("NEOLine.NEO.EVENT.CONNECTED", handleEvent);
        window.removeEventListener("NEOLine.N3.EVENT.CONNECTED", handleEvent);
        window.removeEventListener("NEOLine.NEO.EVENT.ACCOUNT_CHANGED", handleEvent);
        window.removeEventListener("NEOLine.N3.EVENT.ACCOUNT_CHANGED", handleEvent);
      }
      clearTimeout(timer);
    };

    const finishResolve = (account) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(account);
    };

    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const handleEvent = (event) => {
      const address = String(event?.detail?.address || "").trim();
      if (!address || settled) return;

      finishResolve({
        address,
        label: String(event?.detail?.label || PROVIDERS.NEOLINE).trim() || PROVIDERS.NEOLINE,
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("NEOLine.NEO.EVENT.CONNECTED", handleEvent);
      window.addEventListener("NEOLine.N3.EVENT.CONNECTED", handleEvent);
      window.addEventListener("NEOLine.NEO.EVENT.ACCOUNT_CHANGED", handleEvent);
      window.addEventListener("NEOLine.N3.EVENT.ACCOUNT_CHANGED", handleEvent);
    }

    const timer = setTimeout(() => {
      if (pendingConnectionDenied) {
        finishReject(toConnectionDeniedError(PROVIDERS.NEOLINE));
        return;
      }
      finishReject(new Error(tWallet("wallet.errors.neoLineConnectionTimeout", null, "NeoLine connection timed out.")));
    }, timeoutMs);

    Promise.resolve()
      .then(() => n3.getAccount())
      .then((account) => {
        if (account?.address) {
          finishResolve(account);
          return;
        }
        finishReject(new Error(tWallet("wallet.errors.neoLineNoAccount", null, "NeoLine returned no account.")));
      })
      .catch((error) => {
        if (isDapiConnectionDenied(error)) {
          pendingConnectionDenied = true;
          return;
        }
        if (isDapiCanceled(error)) {
          finishReject(new Error("Connection canceled by user."));
          return;
        }
        finishReject(error);
      });
  });
}

function requestNeoLineInvoke(n3, request, timeoutMs = NEOLINE_APPROVAL_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let waitingForAuthorization = false;
    let retryStarted = false;
    let connectedEventReceived = false;

    const cleanup = () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("NEOLine.NEO.EVENT.CONNECTED", handleEvent);
        window.removeEventListener("NEOLine.N3.EVENT.CONNECTED", handleEvent);
      }
      clearTimeout(timer);
    };

    const finishResolve = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const retryInvoke = () => {
      if (settled || retryStarted) return;
      retryStarted = true;

      Promise.resolve()
        .then(() => n3.invoke(request))
        .then(finishResolve)
        .catch((error) => {
          if (isDapiCanceled(error)) {
            finishReject(new Error("Transaction canceled by user."));
            return;
          }
          finishReject(error);
        });
    };

    const handleEvent = () => {
      connectedEventReceived = true;
      if (waitingForAuthorization) {
        retryInvoke();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("NEOLine.NEO.EVENT.CONNECTED", handleEvent);
      window.addEventListener("NEOLine.N3.EVENT.CONNECTED", handleEvent);
    }

    const timer = setTimeout(() => {
      if (waitingForAuthorization) {
        finishReject(toConnectionDeniedError(PROVIDERS.NEOLINE));
        return;
      }
      finishReject(new Error(tWallet("wallet.errors.neoLineInvocationTimeout", null, "NeoLine invocation timed out.")));
    }, timeoutMs);

    Promise.resolve()
      .then(() => n3.invoke(request))
      .then(finishResolve)
      .catch((error) => {
        if (isDapiConnectionDenied(error)) {
          waitingForAuthorization = true;
          if (connectedEventReceived) {
            retryInvoke();
          }
          return;
        }
        if (isDapiCanceled(error)) {
          finishReject(new Error("Transaction canceled by user."));
          return;
        }
        finishReject(error);
      });
  });
}

async function requestAccountWithDeniedRetry(providerName, getAccount, prepareRetry = null) {
  try {
    return await getAccount();
  } catch (err) {
    if (isDapiCanceled(err)) throw new Error(tWallet("wallet.errors.connectionCanceled", null, "Connection canceled by user."));
    if (!isDapiConnectionDenied(err)) throw err;

    if (typeof prepareRetry === "function") {
      try {
        await prepareRetry();
      } catch {
        // best-effort retry preparation
      }
    }

    try {
      return await getAccount();
    } catch (retryErr) {
      if (isDapiCanceled(retryErr)) throw new Error(tWallet("wallet.errors.connectionCanceled", null, "Connection canceled by user."));
      if (isDapiConnectionDenied(retryErr)) {
        if (typeof prepareRetry === "function") {
          try {
            await prepareRetry();
          } catch {
            // best-effort cleanup
          }
        }
        throw toConnectionDeniedError(providerName);
      }
      throw retryErr;
    }
  }
}

const SCOPE_VALUES_BY_NAME = Object.freeze({
  None: 0,
  CalledByEntry: 1,
  CustomContracts: 16,
  CustomGroups: 32,
  Rules: 64,
  Global: 128,
});

function normalizeScopeValue(scope) {
  if (typeof scope === "number") return scope;
  if (typeof scope !== "string") return scope;

  const raw = scope.trim();
  if (!raw) return scope;
  if (/^\d+$/.test(raw)) return Number(raw);

  const normalized = raw.replace(/\s+/g, "");
  return SCOPE_VALUES_BY_NAME[normalized] ?? scope;
}

function normalizeSignersForDapi(signers = []) {
  const normalized = normalizeSignersForRpc(signers);
  if (!Array.isArray(normalized)) return [];
  return normalized.map((signer) => {
    if (!signer || typeof signer !== "object") return signer;
    const scopes = normalizeScopeValue(signer.scopes);
    return { ...signer, scopes };
  });
}

function normalizeSignersForInvokeScript(signers = []) {
  const normalized = normalizeSignersForRpc(signers);
  return normalized.map((signer) => {
    if (!signer || typeof signer !== "object") return signer;
    const scopes = normalizeScopeValue(signer.scopes);
    return { ...signer, scopes };
  });
}

function normalizeTransactionHash(hash) {
  if (typeof hash === "string") {
    return String(hash).trim().replace(/^0x/i, "");
  }

  if (hash instanceof Uint8Array) {
    return bytesToHex(hash);
  }

  if (Array.isArray(hash)) {
    return bytesToHex(Uint8Array.from(hash));
  }

  return "";
}

function normalizePublicKeyResult(result) {
  if (typeof result === "string") {
    return result.trim().replace(/^0x/i, "");
  }

  if (!result || typeof result !== "object") {
    return "";
  }

  const candidate = [
    result.publicKey,
    result.publickey,
    result.data,
    result.value,
  ].find((value) => typeof value === "string" && value.trim());

  return candidate ? candidate.trim().replace(/^0x/i, "") : "";
}

function extractNeoLineSignatureMetadata(result) {
  if (!result || typeof result !== "object") {
    return {
      signature: result?.signature || result?.data || "",
      publicKey: "",
      invocationScript: "",
      verificationScript: "",
    };
  }

  const invocationScript = String(result?.witnesses?.[0]?.invocationScript || "").trim().replace(/^0x/i, "");
  const verificationScript = String(result?.witnesses?.[0]?.verificationScript || "").trim().replace(/^0x/i, "");
  const directSignature = typeof result.signature === "string" && result.signature
    ? result.signature
    : typeof result.data === "string" && result.data
      ? result.data
      : "";

  let signature = directSignature.replace(/^0x/i, "");
  if (!signature && invocationScript && typeof window?.Neon?.wallet?.getSignaturesFromInvocationScript === "function") {
    try {
      const signatures = window.Neon.wallet.getSignaturesFromInvocationScript(invocationScript);
      if (Array.isArray(signatures) && signatures[0]) {
        signature = String(signatures[0]).trim().replace(/^0x/i, "");
      }
    } catch {
      // fall through to regex fallback
    }
  }

  if (!signature && invocationScript) {
    const match = invocationScript.match(/^(?:0c40|40)([0-9a-fA-F]{128})/);
    if (match) signature = match[1];
  }

  let publicKey = "";
  if (verificationScript && typeof window?.Neon?.wallet?.getPublicKeyFromVerificationScript === "function") {
    try {
      publicKey = normalizePublicKeyResult(window.Neon.wallet.getPublicKeyFromVerificationScript(verificationScript));
    } catch {
      publicKey = "";
    }
  }

  if (!publicKey && verificationScript) {
    const checksigMatch = verificationScript.match(/(?:0c21|21)(0[23][0-9a-fA-F]{64})(?:4156e7b327|ac)$/i);
    if (checksigMatch) {
      publicKey = normalizePublicKeyResult(checksigMatch[1]);
    }
  }

  return {
    signature,
    publicKey,
    signerAddress: publicKey ? publicKeyToAddress(publicKey) : "",
    invocationScript,
    verificationScript,
  };
}

async function resolveUnsignedTransactionHash(unsignedTxHex) {
  const sdk = await loadSdk();
  const CompatTransaction = getCompatTransactionClass(sdk);

  try {
    const transaction = CompatTransaction.deserialize(unsignedTxHex);
    const transactionHash = normalizeTransactionHash(transaction?.hash?.());
    if (transactionHash) {
      return transactionHash;
    }
  } catch {
    // Unsigned governance packets are stored without witnesses, so SDK full-transaction
    // deserialization can fail. Fall back to the unsigned decoder used by the viewer.
  }

  const decodedTransaction = decodeUnsignedTransaction(unsignedTxHex);
  const transactionHash = String(decodedTransaction?.hash || "").trim();
  if (transactionHash) {
    return transactionHash;
  }

  throw new Error("Failed to compute the unsigned transaction hash.");
}

async function buildRawTransactionSigningPayload(unsignedTxHex) {
  const sdk = await loadSdk();
  const { RPCClient: RpcClient } = sdk.rpc;
  const { num2hexstring, reverseHex } = await getSdkTools();
  const versionRes = await callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
    const rpcClient = new RpcClient(endpoint);
    return rpcClient.getVersion();
  });
  const magic = Number(versionRes?.protocol?.network);
  if (!Number.isFinite(magic)) {
    throw new Error("Failed to resolve network magic from RPC getversion.");
  }

  const transactionHash = await resolveUnsignedTransactionHash(unsignedTxHex);
  return {
    payload: num2hexstring(magic, 4, true) + reverseHex(transactionHash),
    networkMagic: magic,
    transactionHash,
  };
}

/**
 * Shared connection logic for dapi-based wallets (NeoLine, OneGate).
 * Eliminates duplication across the three provider branches in connect().
 *
 * @param {object} opts
 * @param {string} opts.providerName - Display name / PROVIDERS key
 * @param {function(): (Promise<object>|object)} opts.getDapiFn - Returns the dapi instance (may be async)
 * @param {function(object): Promise<{address:string, label?:string}>} opts.getAccountFn - Retrieves account from dapi
 * @param {{testnet:string, mainnet:string}} opts.switchTarget - Network names for auto-switch
 * @param {number} opts.connectionAttemptId - Last-write-wins guard for async connects
 * @param {boolean} [opts.logNetworkMismatch=true] - Whether to log initial mismatch warning in DEV
 * @returns {Promise<{address:string, label:string}>}
 */
async function connectDapiWallet({
  providerName,
  getDapiFn,
  getAccountFn,
  switchTarget,
  connectionAttemptId,
  logNetworkMismatch = true,
}) {
  const dapi = await getDapiFn();
  let account = await getAccountFn(dapi);

  const walletNetwork = await readDapiNetwork(dapi);
  const shouldRefreshAccountAfterNetworkSwitch = !isWalletNetworkCompatible(walletNetwork);
  if (shouldRefreshAccountAfterNetworkSwitch) {
    if (logNetworkMismatch && import.meta.env.DEV)
      console.warn(
        `Network mismatch during connect. Wallet is on ${walletNetwork}, but Explorer is on ${getCurrentEnv()}`,
      );
  }
  await ensureDapiNetworkCompatible(dapi, {
    switchTarget,
    allowSwitch: true,
    requireKnownNetwork: true,
    providerName,
  });
  if (shouldRefreshAccountAfterNetworkSwitch) {
    account = await readDapiAccount(dapi, providerName);
  }
  assertCurrentConnectionAttempt(connectionAttemptId);
  _connectedProvider = providerName;
  _account = { address: account.address, label: account.label || providerName };
  _networkError = "";
  broadcastWalletStateChange();
  return _account;
}

export const walletService = {
  PROVIDERS,

  /** Current connection state */
  get isConnected() {
    return !!_account;
  },
  get account() {
    return _account;
  },
  get provider() {
    return _connectedProvider;
  },

  /**
   * Detect available wallet providers.
   * @returns {string[]} List of available provider names
   */
  getSupportedProviders() {
    const providers = [
      PROVIDERS.NEOLINE,
      PROVIDERS.ONEGATE,
      PROVIDERS.WALLETCONNECT,
      PROVIDERS.NEON,
      PROVIDERS.WEB3AUTH,
      PROVIDERS.EVM_WALLET,
    ];
    if (isDirectWifProviderEnabled() && isExplorerTestnet()) providers.push(PROVIDERS.TESTNET_WIF);
    return providers;
  },

  getAvailableProviders() {
    const providers = [];
    if (isNeoLineAvailable()) providers.push(PROVIDERS.NEOLINE);
    if (isOneGateAvailable()) providers.push(PROVIDERS.ONEGATE);
    if (isEthereumAvailable()) providers.push(PROVIDERS.EVM_WALLET);
    if (isWalletConnectConfigured()) providers.push(PROVIDERS.WALLETCONNECT);
    if (isWalletConnectConfigured()) providers.push(PROVIDERS.NEON);
    if (isDirectWifProviderEnabled() && isExplorerTestnet()) providers.push(PROVIDERS.TESTNET_WIF);
    if (isWeb3AuthConfigured()) providers.push(PROVIDERS.WEB3AUTH);
    return [...new Set(providers)];
  },

  getChatAuthSupport() {
    if (!_connectedProvider) {
      return { supported: false, reason: tWallet("wallet.chatSupport.connectFirst", null, "Connect a wallet first.") };
    }

    if (
      _connectedProvider === PROVIDERS.NEOLINE ||
      _connectedProvider === PROVIDERS.ONEGATE ||
      _connectedProvider === PROVIDERS.TESTNET_WIF ||
      _connectedProvider === PROVIDERS.WEB3AUTH
    ) {
      return { supported: true, reason: "" };
    }

    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      return {
        supported: false,
        reason: tWallet(
          "wallet.chatSupport.evmWallet",
          null,
          "NeoChat is not yet supported for EVM wallet connections. Use a Neo-native wallet or Testnet WIF.",
        ),
      };
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      return {
        supported: false,
        reason: tWallet(
          "wallet.chatSupport.noPubkey",
          null,
          "This wallet connection does not reliably expose the Neo public key needed for NeoChat login yet. Use NeoLine, OneGate, Web3Auth, or Testnet WIF.",
        ),
      };
    }

    return {
      supported: false,
      reason: tWallet(
        "wallet.chatSupport.providerNotSupported",
        null,
        "This wallet provider is not supported for NeoChat login.",
      ),
    };
  },

  /**
   * Connect to a wallet provider.
   * @param {string} providerName - provider display name
   * @returns {Promise<{address: string, label: string}>}
   */
  async connect(providerName, options = {}) {
    const connectionAttemptId = Number.isFinite(options?.connectionAttemptId)
      ? options.connectionAttemptId
      : beginConnectionAttempt();

    if (providerName === PROVIDERS.NEOLINE) {
      await waitForNeoLine();
      return connectDapiWallet({
        providerName: PROVIDERS.NEOLINE,
        getDapiFn: getNeoLineN3,
        getAccountFn: (n3) => requestNeoLineAccount(n3),
        switchTarget: { testnet: "N3TestNet", mainnet: "N3MainNet" },
        connectionAttemptId,
      });
    }

    if (providerName === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      if (!dapi) throw new Error(tWallet("wallet.errors.oneGateNotDetected", null, "OneGate wallet not detected"));
      return connectDapiWallet({
        providerName: PROVIDERS.ONEGATE,
        getDapiFn: () => dapi,
        getAccountFn: (d) => requestAccountWithDeniedRetry(PROVIDERS.ONEGATE, () => d.getAccount()),
        switchTarget: { testnet: "TestNet", mainnet: "MainNet" },
        connectionAttemptId,
      });
    }

    if (providerName === PROVIDERS.TESTNET_WIF) {
      if (!isDirectWifProviderEnabled()) {
        throw new Error(tWallet("wallet.errors.directWifLocalOnly", null, "Direct WIF testing is only available in local development."));
      }
      if (!isExplorerTestnet()) {
        throw new Error(tWallet("wallet.errors.directWifTestnetOnly", null, "Direct WIF testing is only allowed while the explorer is on testnet."));
      }

      const wif = String(options?.wif || "").trim();
      const { Account: SdkAccount } = await loadSdk();
      let account;
      try {
        account = SdkAccount.fromWIF(wif);
      } catch {
        throw new Error(tWallet("wallet.errors.invalidWif", null, "Invalid WIF."));
      }

      assertCurrentConnectionAttempt(connectionAttemptId);
      _connectedProvider = PROVIDERS.TESTNET_WIF;
      _directWifAccount = account;
      _account = {
        address: account.address,
        label: PROVIDERS.TESTNET_WIF,
        persistSession: "session",
      };
      _networkError = "";
      broadcastWalletStateChange();
      return _account;
    }

    if (providerName === PROVIDERS.WALLETCONNECT || providerName === PROVIDERS.NEON) {
      const projectId = getWalletConnectProjectId();
      if (!projectId) {
        throw new Error(tWallet("wallet.errors.walletConnectNotConfigured", null, "WalletConnect is not configured. Set VITE_WC_PROJECT_ID to enable this wallet."));
      }
      const walletConnectService = await loadWalletConnectServiceWithSessionSync();
      await walletConnectService.init(projectId);
      const { uri, approval } = await walletConnectService.connect();
      assertCurrentConnectionAttempt(connectionAttemptId);
      return {
        uri,
        approval: approval.then(async () => {
          if (!isCurrentConnectionAttempt(connectionAttemptId)) {
            try {
              await walletConnectService.disconnect();
            } catch {
              // Best-effort cleanup; the stale approval must not commit state.
            }
            assertCurrentConnectionAttempt(connectionAttemptId);
          }
          _connectedProvider = providerName;
          _account = {
            ...(walletConnectService.account || {}),
            label: providerName,
          };
          _networkError = "";
          broadcastWalletStateChange();
          return _account;
        }),
      };
    }

    if (providerName === PROVIDERS.WEB3AUTH) {
      if (!isWeb3AuthConfigured()) {
        throw new Error(tWallet("wallet.errors.web3AuthNotConfigured", null, "Web3Auth is not configured. Set VITE_WEB3AUTH_CLIENT_ID to enable Google / Email login."));
      }
      const web3authService = await loadWeb3authService();
      const account = await web3authService.connect();
      assertCurrentConnectionAttempt(connectionAttemptId);
      _connectedProvider = PROVIDERS.WEB3AUTH;
      _account = { address: account.address, label: "Web3Auth Account" };
      _networkError = "";
      broadcastWalletStateChange();
      return _account;
    }

    if (providerName === PROVIDERS.EVM_WALLET) {
      const { ethers } = await import("ethers");
      if (!isEthereumAvailable()) throw new Error(tWallet("wallet.errors.evmWalletNotInstalled", null, "EVM Wallet is not installed."));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) throw new Error(tWallet("wallet.errors.evmNoAccounts", null, "No EVM accounts found."));

      const evmAddress = accounts[0].toLowerCase();
      const aaHash = getAbstractAccountHash();

      // The uncompressed pubkey derives the Neo AA address, so it must
      // provably belong to the connected EVM address. An uncompressed
      // secp256k1 key recovered from a signMessage payload has the form
      // 04 || X(32) || Y(32) (130 hex chars). ethers.computeAddress accepts
      // the 0x04-prefixed key and yields the canonical EVM address.
      const pubKeyMatchesEvmAddress = (candidate) => {
        try {
          if (!candidate || candidate.length !== 130 || !candidate.startsWith("04")) return false;
          return ethers.computeAddress("0x" + candidate).toLowerCase() === evmAddress;
        } catch {
          return false;
        }
      };

      let uncompressedPubKey = localStorage.getItem(`evm_pubkey_${evmAddress}`);
      // Cached value is keyed only by EVM address and is fully attacker-writable;
      // never trust it without verifying it derives back to that EVM address.
      if (uncompressedPubKey && !pubKeyMatchesEvmAddress(uncompressedPubKey)) {
        localStorage.removeItem(`evm_pubkey_${evmAddress}`);
        uncompressedPubKey = null;
      }

      if (!uncompressedPubKey) {
        try {
          const signer = await provider.getSigner();
          // Bind the identity message to this app origin, the active Neo
          // network, and the AA contract hash so a signature captured on one
          // site/chain can't be replayed to derive an identity elsewhere.
          const message =
            "Welcome to Neo N3 Explorer!\n\n" +
            "Please sign this message to derive your cross-chain Abstract Account identity. " +
            "This operation does not cost any gas.\n\n" +
            `Origin: ${typeof window !== "undefined" ? window.location.origin : ""}\n` +
            `Network: ${getDapiNetworkName()}\n` +
            `Abstract Account: ${aaHash}`;
          const signature = await signer.signMessage(message);
          const digest = ethers.hashMessage(message);
          uncompressedPubKey = ethers.SigningKey.recoverPublicKey(digest, signature).slice(2);
          // Confirm the recovered key actually belongs to the connected EVM
          // address before caching/using it.
          if (!pubKeyMatchesEvmAddress(uncompressedPubKey)) {
            throw new Error("Recovered public key does not match the connected EVM address.");
          }
        } catch (e) {
          throw new Error(tWallet("wallet.errors.aaSignatureRequired", null, "Signature is required to generate your Abstract Account identity."));
        }
        assertCurrentConnectionAttempt(connectionAttemptId);
        localStorage.setItem(`evm_pubkey_${evmAddress}`, uncompressedPubKey);
      }

      const neoAddress = await deriveEvmNeoAddressFromPublicKey(uncompressedPubKey);

      assertCurrentConnectionAttempt(connectionAttemptId);
      _connectedProvider = PROVIDERS.EVM_WALLET;
      _account = { address: neoAddress, label: "EVM Wallet", pubKey: uncompressedPubKey, evmAddress };
      _networkError = "";
      attachEvmListeners();
      broadcastWalletStateChange();
      return _account;
    }

    throw new Error(`Unknown provider: ${providerName}`);
  },

  hydrateSession(providerName, account, options = {}) {
    if (!providerName || !account?.address) {
      throw new Error("Invalid wallet session payload.");
    }
    if (Number.isFinite(options?.connectionAttemptId)) {
      assertCurrentConnectionAttempt(options.connectionAttemptId);
    }
    _connectedProvider = providerName;
    _account = account;
    _networkError = "";
    broadcastWalletStateChange();
  },

  async restoreSession(providerName, options = {}) {
    const connectionAttemptId = Number.isFinite(options?.connectionAttemptId)
      ? options.connectionAttemptId
      : beginConnectionAttempt();

    if (providerName === PROVIDERS.TESTNET_WIF) {
      const wif = String(options?.wif || "").trim();
      if (!wif) return null;
      return this.connect(providerName, { wif, connectionAttemptId });
    }

    if (providerName === PROVIDERS.WEB3AUTH) {
      const web3authService = await loadWeb3authService();
      await web3authService.init();
      const account = await web3authService.getAccount();
      if (!account?.address) return null;

      assertCurrentConnectionAttempt(connectionAttemptId);
      _connectedProvider = PROVIDERS.WEB3AUTH;
      _account = { address: account.address, label: "Web3Auth Account" };
      _networkError = "";
      broadcastWalletStateChange();
      return _account;
    }

    if (providerName !== PROVIDERS.NEON && providerName !== PROVIDERS.WALLETCONNECT) return null;

    const projectId = getWalletConnectProjectId();
    if (!projectId) return null;

    const walletConnectService = await loadWalletConnectServiceWithSessionSync();
    await walletConnectService.init(projectId);
    const account = await walletConnectService.restoreSession();
    if (!account?.address) return null;

    await assertWalletConnectAttemptCurrent(connectionAttemptId, walletConnectService);
    if (typeof walletConnectService.ensureNetworkCompatible === "function") {
      await walletConnectService.ensureNetworkCompatible();
      await assertWalletConnectAttemptCurrent(connectionAttemptId, walletConnectService);
    }
    const activeAccount = walletConnectService.account || account;
    if (!activeAccount?.address) return null;

    _connectedProvider = providerName;
    _account = {
      ...activeAccount,
      label: providerName,
    };
    _networkError = "";
    broadcastWalletStateChange();
    return _account;
  },

  beginPassiveRestore() {
    return beginConnectionAttempt();
  },

  isConnectionAttemptCurrent(attemptId) {
    return isCurrentConnectionAttempt(attemptId);
  },

  isConnectionSupersededError(error) {
    return error?.code === CONNECTION_SUPERSEDED_CODE;
  },

  cancelPendingConnection() {
    beginConnectionAttempt();
  },

  /** Disconnect wallet */
  disconnect() {
    beginConnectionAttempt();
    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      void loadWalletConnectServiceWithSessionSync().then((walletConnectService) => {
        walletConnectService.disconnect();
      }).catch(() => {});
    }
    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      void loadWeb3authService().then((web3authService) => {
        web3authService.disconnect();
      }).catch(() => {});
    }
    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      detachEvmListeners();
    }
    _connectedProvider = null;
    _account = null;
    _neolineN3 = null;
    _directWifAccount = null;
    _networkError = "";
    broadcastWalletStateChange();
  },

  async ensureNetworkConsistency({ allowSwitch = true, verifyAccount = true } = {}) {
    if (!_account) return true;

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      await ensureDapiNetworkCompatible(n3, {
        switchTarget: { testnet: "N3TestNet", mainnet: "N3MainNet" },
        allowSwitch,
        requireKnownNetwork: true,
        providerName: PROVIDERS.NEOLINE,
      });
      if (!verifyAccount) return true;
      return ensureConnectedDapiAccountStillActive(n3, PROVIDERS.NEOLINE);
    }

    if (_connectedProvider === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      if (!dapi) {
        const error = new Error(tWallet("wallet.errors.oneGateNotDetected", null, "OneGate wallet not detected"));
        _networkError = error.message;
        broadcastWalletStateChange();
        throw error;
      }
      await ensureDapiNetworkCompatible(dapi, {
        switchTarget: { testnet: "TestNet", mainnet: "MainNet" },
        allowSwitch,
        requireKnownNetwork: true,
        providerName: PROVIDERS.ONEGATE,
      });
      if (!verifyAccount) return true;
      return ensureConnectedDapiAccountStillActive(dapi, PROVIDERS.ONEGATE);
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      const walletConnectService = await loadWalletConnectServiceWithSessionSync();
      if (typeof walletConnectService.ensureNetworkCompatible === "function") {
        try {
          await walletConnectService.ensureNetworkCompatible();
          syncConnectedWalletConnectAccount(walletConnectService, _connectedProvider);
          _networkError = "";
          broadcastWalletStateChange();
          return true;
        } catch (error) {
          _networkError = error?.message || String(error);
          broadcastWalletStateChange();
          throw error;
        }
      }
      return true;
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF && !isExplorerTestnet()) {
      const error = new Error(tWallet("wallet.errors.directWifTestnetOnly", null, "Direct WIF testing is only allowed while the explorer is on testnet."));
      _networkError = error.message;
      broadcastWalletStateChange();
      throw error;
    }

    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      await ensureConnectedEvmAccountStillActive();
      if (_account?.pubKey) {
        const nextAddress = await deriveEvmNeoAddressFromPublicKey(_account.pubKey);
        if (nextAddress && nextAddress !== _account.address) {
          _account = { ..._account, address: nextAddress };
        }
      }
    }

    _networkError = "";
    broadcastWalletStateChange();
    return true;
  },

  /**
   * Invoke a contract method (write operation, requires wallet signature).
   * @param {Object} params
   * @param {string} params.scriptHash - Contract hash (0x-prefixed)
   * @param {string} params.operation - Method name
   * @param {Array} params.args - Method arguments [{type, value}]
   * @returns {Promise<{txid: string}>}
   */

  async getRawTransactionSigningPayload(unsignedTxHex) {
    return buildRawTransactionSigningPayload(unsignedTxHex);
  },

  async getPublicKey() {
    if (!_account) throw new Error(tWallet("wallet.notConnected", null, "Wallet not connected"));
    await this.ensureNetworkConsistency();

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      if (typeof n3.getPublicKey === "function") {
        return normalizePublicKeyResult(await n3.getPublicKey());
      }
      return "";
    }

    if (_connectedProvider === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      if (typeof dapi?.getPublicKey === "function") {
        return normalizePublicKeyResult(await dapi.getPublicKey());
      }
      return "";
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const web3authService = await loadWeb3authService();
      const account = await web3authService.getAccount();
      return normalizePublicKeyResult(account?.publicKey);
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF) {
      return normalizePublicKeyResult(
        typeof _directWifAccount?.publicKey?.toHex === "function"
          ? _directWifAccount.publicKey.toHex()
          : _directWifAccount?.publicKey,
      );
    }

    return normalizePublicKeyResult(_account?.publicKey || _account?.pubKey);
  },

  async signRawTransaction(unsignedTxHex) {
    const result = await this.signRawTransactionDetailed(unsignedTxHex);
    return result.signature;
  },

  async signRawTransactionDetailed(unsignedTxHex) {
    if (!_account) throw new Error(tWallet("wallet.notConnected", null, "Wallet not connected"));
    await this.ensureNetworkConsistency();

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      if (typeof n3.signTransaction === "function") {
        let walletNetwork = "";
        if (typeof n3.getNetworks === "function") {
          try {
            const networks = await n3.getNetworks();
            walletNetwork = String(networks?.defaultNetwork || "");
          } catch {
            walletNetwork = "";
          }
        }

        const expectedNetwork = getDapiNetworkName();
        if (!isWalletNetworkCompatible(walletNetwork) && typeof n3.switchNetwork === "function") {
          try {
            await n3.switchNetwork({ network: expectedNetwork });
          } catch {
            // Best effort. signTransaction still receives the target network below.
          }
        }

        try {
          const res = await n3.signTransaction({ transaction: unsignedTxHex, network: expectedNetwork });
          const details = extractNeoLineSignatureMetadata(res);
          if (!details.signature) {
            throw new Error(tWallet("wallet.errors.neoLineNoSignature", null, "NeoLine returned no transaction signature."));
          }
          return details;
        } catch (error) {
          if (isDapiCanceled(error)) {
            throw new Error(tWallet("wallet.errors.txCanceledByUser", null, "Transaction canceled by user."));
          }
          throw toReadableWalletError(error, "NeoLine failed to sign the transaction.");
        }
      }
      throw new Error(tWallet("wallet.errors.neoLineNoSignTransaction", null, "NeoLine does not support signTransaction."));
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const web3authService = await loadWeb3authService();
      const account = await web3authService.getAccount();
      // Sign the network-magic-prefixed signing payload (magic(4) + reverse(hash)),
      // not the bare transaction hash — signing the bare hash yields on-chain-invalid
      // witnesses. This must match the TESTNET_WIF branch below.
      const { payload } = await buildRawTransactionSigningPayload(unsignedTxHex);
      return {
        signature: account.sign(payload),
        publicKey: normalizePublicKeyResult(account?.publicKey),
        signerAddress: String(account?.address || _account?.address || "").trim(),
      };
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF) {
      if (!_directWifAccount) throw new Error("Direct WIF account unavailable.");
      const { payload } = await buildRawTransactionSigningPayload(unsignedTxHex);
      return {
        signature: _directWifAccount.sign(payload),
        publicKey: normalizePublicKeyResult(
          typeof _directWifAccount?.publicKey?.toHex === "function"
            ? _directWifAccount.publicKey.toHex()
            : _directWifAccount?.publicKey,
        ),
        signerAddress: String(_directWifAccount?.address || _account?.address || "").trim(),
      };
    }

    throw new Error("Provider does not support raw transaction signing in browser.");
  },

  async switchWalletAccount() {
    if (!_account) throw new Error(tWallet("wallet.notConnected", null, "Wallet not connected"));

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      if (typeof n3.switchWalletAccount !== "function") {
        throw new Error(tWallet("wallet.errors.neoLineNoAccountSwitch", null, "NeoLine does not support account switching."));
      }

      const nextAccount = await n3.switchWalletAccount();
      if (!nextAccount?.address) {
        throw new Error(tWallet("wallet.errors.neoLineSwitchNoAccount", null, "NeoLine returned no account after switching."));
      }

      _account = {
        address: nextAccount.address,
        label: String(nextAccount.label || PROVIDERS.NEOLINE).trim() || PROVIDERS.NEOLINE,
      };
      await this.ensureNetworkConsistency();
      return _account;
    }

    throw new Error(tWallet("wallet.errors.activeWalletNoSwitch", null, "Active wallet does not support account switching."));
  },

  async signMessage(message) {
    if (!_account) throw new Error(tWallet("wallet.notConnected", null, "Wallet not connected"));
    await this.ensureNetworkConsistency();

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      return normalizeSignMessageResult(await n3.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      return normalizeSignMessageResult(await dapi.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      const walletConnectService = await loadWalletConnectServiceWithSessionSync();
      return normalizeSignMessageResult(await walletConnectService.signMessage(message));
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF) {
      if (!_directWifAccount) throw new Error("Direct WIF account unavailable.");
      const { str2hexstring } = await getSdkTools();
      const messageHex = str2hexstring(message);
      return normalizeSignMessageResult({
        publicKey: _directWifAccount.publicKey.toHex(),
        data: _directWifAccount.sign(messageHex),
        salt: "",
        message,
      });
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const web3authService = await loadWeb3authService();
      const account = await web3authService.getAccount();
      // Emulate NeoLine's returned structure
      const { str2hexstring } = await getSdkTools();
      const messageHex = str2hexstring(message);
      const signature = account.sign(messageHex);
      return normalizeSignMessageResult({
        publicKey: account.publicKey,
        data: signature,
        salt: "",
        message: message,
      });
    }

    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = typeof signer.getAddress === "function" ? await signer.getAddress() : "";
      assertEvmAddressMatchesConnectedWallet(signerAddress);
      const signature = await signer.signMessage(message);
      return normalizeSignMessageResult({
        publicKey: "",
        data: signature,
        salt: "",
        message: message,
      });
    }

    throw new Error(tWallet("wallet.errors.noWalletConnected", null, "No wallet connected"));
  },

  async invoke({ scriptHash, operation, args = [], scope = 1, signers = null, broadcastOverride = false }) {
    if (!_account) throw new Error(tWallet("wallet.notConnected", null, "Wallet not connected"));
    await this.ensureNetworkConsistency();

    const dapiArgs = args.map(normalizeArgForDapi);

    const defaultSignerAccount = normalizeHash160(_account.address);
    const invokeSigners = signers || [{ account: defaultSignerAccount, scopes: scope }];
    const dapiSigners = normalizeSignersForDapi(invokeSigners);

    const expectedNetwork = getDapiNetworkName();
    const legacyNetworkAlias = getLegacyDapiNetworkAlias();

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      const request = {
        scriptHash,
        operation,
        args: dapiArgs,
        signers: dapiSigners,
      };
      if (broadcastOverride) request.broadcastOverride = true;
      const result = await requestNeoLineInvoke(n3, request);
      // broadcastOverride returns { signedTx } instead of { txid }
      return broadcastOverride ? result : { txid: result.txid };
    }

    if (_connectedProvider === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      const requestBase = {
        scriptHash,
        operation,
        args: dapiArgs,
        signers: dapiSigners,
      };
      const invokeWithNetwork = async (network) => {
        const request = { ...requestBase, network };
        if (broadcastOverride) request.broadcastOverride = true;
        return dapi.invoke(request);
      };

      let result;
      try {
        result = await invokeWithNetwork(expectedNetwork);
      } catch (err) {
        if (!shouldRetryWithLegacyDapiNetwork(err, expectedNetwork, legacyNetworkAlias)) {
          throw err;
        }
        result = await invokeWithNetwork(legacyNetworkAlias);
      }
      return broadcastOverride ? result : { txid: result.txid };
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      const walletConnectService = await loadWalletConnectServiceWithSessionSync();
      return walletConnectService.invoke({ scriptHash, operation, args: dapiArgs, signerScope: scope, signers: dapiSigners });
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF) {
      if (!_directWifAccount) throw new Error("Direct WIF account unavailable.");

      const normalizedArgs = normalizeInvokeArgsForRpc(args);
      const normalizedSigners = normalizeSignersForInvokeScript(invokeSigners);

      const invalidArg = normalizedArgs.find((arg) => arg?.type === "Hash160" && !isHash160Hex(arg.value));
      if (invalidArg) {
        throw new Error(`Invalid Hash160 argument for "${operation}".`);
      }

      const invalidSigner = normalizedSigners.find((signer) => !isHash160Hex(signer?.account));
      if (invalidSigner) {
        throw new Error(`Invalid signer account for "${operation}".`);
      }

      const { ScriptBuilder } = await getSdkTools();
      const sb = new ScriptBuilder();
      sb.emitContractCall(
        scriptHash,
        operation,
        undefined,
        normalizedArgs.map((arg) => arg.value),
      );
      const script = sb.toHex();

      return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
        const sdk = await loadSdk();
        const { RPCClient: RpcClient } = sdk.rpc;
        const CompatTransaction = getCompatTransactionClass(sdk);
        const rpcClient = new RpcClient(endpoint);
        const currentHeight = await rpcClient.getBlockCount();
        const versionRes = await rpcClient.getVersion();
        const magic = Number(versionRes?.protocol?.network);
        if (!Number.isFinite(magic)) {
          throw new Error("Failed to resolve network magic from RPC getversion.");
        }
        const invokeRes = await rpcClient.invokeScript({ script, signers: normalizedSigners });
        if (invokeRes.state === "FAULT") {
          throw new Error("Simulation Faulted: " + invokeRes.exception);
        }

        let txn = new CompatTransaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script: hexToBytes(script),
          systemFee: BigInt(invokeRes.gasconsumed || 1000000),
        });

        txn.sign(_directWifAccount.privateKey, magic);
        const networkFee = await rpcClient.calculateNetworkFee({ tx: txn.serialize(true) });

        txn = new CompatTransaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script: hexToBytes(script),
          systemFee: BigInt(invokeRes.gasconsumed || 1000000),
          networkFee: BigInt(networkFee),
        });
        txn.sign(_directWifAccount.privateKey, magic);

        if (broadcastOverride) {
          return { signedTx: txn.serialize(true) };
        }

        return { txid: await rpcClient.sendRawTransaction({ tx: txn.serialize(true) }) };
      });
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const web3authService = await loadWeb3authService();
      const account = await web3authService.getAccount();
      const normalizedArgs = normalizeInvokeArgsForRpc(args);
      const normalizedSigners = normalizeSignersForInvokeScript(invokeSigners);

      const invalidArg = normalizedArgs.find((arg) => arg?.type === "Hash160" && !isHash160Hex(arg.value));
      if (invalidArg) {
        throw new Error(`Invalid Hash160 argument for "${operation}".`);
      }

      const invalidSigner = normalizedSigners.find((signer) => !isHash160Hex(signer?.account));
      if (invalidSigner) {
        throw new Error(`Invalid signer account for "${operation}".`);
      }

      const { ScriptBuilder } = await getSdkTools();
      const sb = new ScriptBuilder();
      sb.emitContractCall(
        scriptHash,
        operation,
        undefined,
        normalizedArgs.map((a) => a.value),
      );
      const script = sb.toHex();

      return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
        const sdk = await loadSdk();
        const { RPCClient: RpcClient } = sdk.rpc;
        const CompatTransaction = getCompatTransactionClass(sdk);
        const rpcClient = new RpcClient(endpoint);
        const currentHeight = await rpcClient.getBlockCount();
        const versionRes = await rpcClient.getVersion();
        const magic = Number(versionRes?.protocol?.network);
        if (!Number.isFinite(magic)) {
          throw new Error("Failed to resolve network magic from RPC getversion.");
        }
        const invokeRes = await rpcClient.invokeScript({ script, signers: normalizedSigners });

        if (invokeRes.state === "FAULT") {
          throw new Error("Web3Auth Simulation Faulted: " + invokeRes.exception);
        }

        let txn = new CompatTransaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script: hexToBytes(script),
          systemFee: BigInt(invokeRes.gasconsumed || 1000000),
        });
        txn.sign(account.privateKey, magic);

        const networkFee = await rpcClient.calculateNetworkFee({ tx: txn.serialize(true) });

        // Resign with final explicit fees
        txn = new CompatTransaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script: hexToBytes(script),
          systemFee: BigInt(invokeRes.gasconsumed || 1000000),
          networkFee: BigInt(networkFee),
        });
        txn.sign(account.privateKey, magic);

        if (broadcastOverride) {
          return { signedTx: txn.serialize(true) };
        }

        const txid = await rpcClient.sendRawTransaction({ tx: txn.serialize(true) });
        return { txid };
      });
    }

    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      const { ethers } = await import("ethers");
      if (!isEthereumAvailable()) throw new Error(tWallet("wallet.errors.evmWalletNotInstalled", null, "EVM Wallet is not installed."));

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const normalizedArgs = normalizeInvokeArgsForRpc(args);
      const invalidArg = normalizedArgs.find((arg) => arg?.type === "Hash160" && !isHash160Hex(arg.value));
      if (invalidArg) throw new Error("Invalid Hash160 argument.");

      const aaHash = getAbstractAccountHash();
      if (!aaHash) {
        throw new Error("Abstract account contract hash is not configured (VITE_AA_HASH_*).");
      }

      const cleanTargetContract = normalizeHash160(scriptHash);
      if (!isHash160Hex(cleanTargetContract)) {
        throw new Error("Invalid target contract hash.");
      }

      const signerAddress = (await signer.getAddress()).toLowerCase();
      assertEvmAddressMatchesConnectedWallet(signerAddress);
      const parsedOperation = assertAllowedAaMetaMethod(operation);

      let accountId = _account?.pubKey || localStorage.getItem(`evm_pubkey_${signerAddress}`);
      if (!accountId) {
        throw new Error("Missing public key identity. Please reconnect your EVM wallet.");
      }

      const { ScriptBuilder, hash160, reverseHex } = await getSdkTools();
      const verifyScript = new ScriptBuilder()
        .emitContractCall(aaHash, "verify", undefined, [hexToBytes(accountId)])
        .toBytes();
      const accountAddress = normalizeHash160(reverseHex(hash160(verifyScript)));
      if (!isHash160Hex(accountAddress)) {
        throw new Error("Unable to derive abstract account address.");
      }

      // Snapshot the network so a mid-flight switch can't ship a payload
      // intended for one chain to another.
      const startNetwork = getCurrentEnv();

      const prepareResponse = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          network: startNetwork,
          aaHash,
          accountAddress,
          accountId,
          signerAddress,
          targetContract: cleanTargetContract,
          method: parsedOperation,
          args: normalizedArgs,
        }),
      });

      if (!prepareResponse.ok) {
        const errData = await prepareResponse.json();
        throw new Error(errData.error || "Relayer error");
      }

      const prepared = await prepareResponse.json();
      if (!prepared?.domain?.chainId || !prepared?.domain?.verifyingContract) {
        throw new Error("Relayer prepare payload is missing EIP-712 domain fields.");
      }
      if (!prepared?.message?.argsHash || !prepared?.message?.deadline) {
        throw new Error("Relayer prepare payload is missing signed message fields.");
      }
      if (prepared?.message?.nonce === undefined || prepared?.message?.nonce === null) {
        // The execute call below sends `nonce` to the relayer; if the relayer
        // omitted it from prepare, every retry gets a non-deterministic nonce
        // and signature replay protection is moot.
        throw new Error("Relayer prepare payload is missing nonce.");
      }
      if (!prepared?.signerAddress) {
        throw new Error("Relayer prepare payload is missing signerAddress.");
      }
      // Reject obviously-stale deadlines so the user isn't asked to sign a
      // payload that can't be executed. Deadlines look like Unix seconds in
      // the AA EIP-712 schema — anything before now is unusable.
      const deadlineSeconds = Number(prepared.message.deadline);
      // 5-second skew tolerance — the relayer signs against block time;
      // a slightly fast client clock shouldn't trip a "deadline expired"
      // for a deadline still seconds in the chain's future.
      const DEADLINE_SKEW_TOLERANCE_S = 5;
      if (!Number.isFinite(deadlineSeconds) || deadlineSeconds + DEADLINE_SKEW_TOLERANCE_S <= Math.floor(Date.now() / 1000)) {
        throw new Error("Relayer returned an expired deadline.");
      }
      // Defence-in-depth: the relayer signs the prepare response with our
      // input, but a compromised relayer could swap signerAddress. Compare
      // against the wallet we just queried; the wallet will display its own
      // chain anyway when it pops up to sign typed data.
      if (String(prepared.signerAddress).toLowerCase() !== signerAddress) {
        throw new Error("Relayer signerAddress did not match connected wallet.");
      }

      const signature = await signer.signTypedData(prepared.domain, prepared.types, prepared.message);
      await ensureConnectedEvmAccountStillActive();
      const digest = ethers.TypedDataEncoder.hash(prepared.domain, prepared.types, prepared.message);
      const uncompressedPubKey = ethers.SigningKey.recoverPublicKey(digest, signature);
      assertEvmAddressMatchesConnectedWallet(ethers.computeAddress(uncompressedPubKey));

      // If the user switched networks while the wallet popup was open, abort
      // before broadcasting a payload bound to the previous network.
      if (getCurrentEnv() !== startNetwork) {
        throw new Error("Network changed during signing; please retry.");
      }

      const executeResponse = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          network: startNetwork,
          aaHash,
          accountAddress,
          accountId,
          signerAddress,
          targetContract: cleanTargetContract,
          method: parsedOperation,
          args: normalizedArgs,
          argsHash: prepared.message?.argsHash,
          nonce: prepared.message?.nonce,
          deadline: prepared.message?.deadline,
          signature,
          uncompressedPubKey,
        }),
      });

      if (!executeResponse.ok) {
        const errData = await executeResponse.json();
        throw new Error(errData.error || "Relayer error");
      }

      const data = await executeResponse.json();
      if (!data || typeof data.txid !== "string" || !data.txid) {
        throw new Error("Relayer returned no txid.");
      }
      return { txid: data.txid };
    }

    throw new Error(tWallet("wallet.errors.noWalletConnected", null, "No wallet connected"));
  },

  async simulateInvoke({ scriptHash, operation, args = [], scope = 1, signers = null }) {
    if (!_account) throw new Error(tWallet("wallet.notConnected", null, "Wallet not connected"));
    await this.ensureNetworkConsistency();
    const invokeSigners = signers || [{ account: _account.address, scopes: scope }];
    const normalizedArgs = normalizeInvokeArgsForRpc(args);
    const normalizedSigners = normalizeSignersForInvokeScript(invokeSigners);

    const invalidArg = normalizedArgs.find((arg) => arg?.type === "Hash160" && !isHash160Hex(arg.value));
    if (invalidArg) {
      throw new Error(`Invalid Hash160 argument for "${operation}".`);
    }

    const invalidSigner = normalizedSigners.find((signer) => !isHash160Hex(signer?.account));
    if (invalidSigner) {
      throw new Error(`Invalid signer account for "${operation}".`);
    }

    const { ScriptBuilder } = await getSdkTools();
    const sb = new ScriptBuilder();
    sb.emitContractCall(
      scriptHash,
      operation,
      undefined,
      normalizedArgs.map((a) => a.value),
    );
    const script = sb.toHex();

    return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
      const { RPCClient: RpcClient } = (await loadSdk()).rpc;
      const rpcClient = new RpcClient(endpoint);
      return rpcClient.invokeScript({ script, signers: normalizedSigners });
    });
  },

  async broadcastSignedTx(signedTx) {
    if (!signedTx) throw new Error(tWallet("wallet.errors.signedTxEmpty", null, "Signed transaction is empty."));
    const { RPCClient: RpcClient } = (await loadSdk()).rpc;
    return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
      const rpcClient = new RpcClient(endpoint);
      return rpcClient.sendRawTransaction({ tx: signedTx });
    });
  },
};

/**
 * Map Neo ABI parameter types to dapi argument types.
 * @param {string} abiType - ABI type (e.g. "Integer", "Hash160", "String", "ByteArray", "Boolean")
 * @returns {string} dapi type
 */
function mapParamType(abiType) {
  const map = {
    0: "Any",
    16: "Boolean",
    17: "Integer",
    18: "ByteArray",
    19: "String",
    20: "Hash160",
    21: "Hash256",
    22: "PublicKey",
    23: "Signature",
    32: "Array",
    34: "Map",
    Integer: "Integer",
    String: "String",
    Boolean: "Boolean",
    Hash160: "Hash160",
    Hash256: "Hash256",
    ByteArray: "ByteArray",
    PublicKey: "PublicKey",
    Signature: "Signature",
    Array: "Array",
    Map: "Map",
    Any: "Any",
  };
  return map[abiType] || "String";
}

function normalizeArgValueForDapi(type, value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && "type" in item) {
        return normalizeArgForDapi(item);
      }
      return item;
    });
  }

  if (!value || typeof value !== "object") {
    if (type === "Hash160" && typeof value === "string") {
      return normalizeHash160(value);
    }
    if (type === "Boolean" && typeof value === "string") {
      const text = value.trim().toLowerCase();
      if (text === "true" || text === "1") return true;
      if (text === "false" || text === "0") return false;
    }
    if ((type === "Array" || type === "Map") && typeof value === "string") {
      // Plain text from the manifest write tab — defer JSON parsing to the
      // shared buildContractParam path so error messages stay consistent
      // between read and write flows.
      try {
        const built = buildContractParam(type, value);
        return built.value;
      } catch {
        return value;
      }
    }
    return value;
  }

  if (
    type === "Hash160" ||
    type === "Hash256" ||
    type === "PublicKey" ||
    type === "Signature" ||
    type === "ByteArray"
  ) {
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      const stringValue = value.toString();
      if (type === "Hash160") {
        return normalizeHash160(stringValue);
      }
      return stringValue;
    }
  }

  return value;
}

function normalizeArgForDapi(arg = {}) {
  const type = mapParamType(arg?.type);
  return {
    type,
    value: normalizeArgValueForDapi(type, arg?.value),
  };
}

export default walletService;
