/**
 * Wallet Service — NeoLine / O3 wallet integration for Neo N3
 * @module services/walletService
 * @description Detects browser wallet extensions and provides invoke/sign capabilities
 */

import { walletConnectService } from "./walletConnectService";
import { web3authService } from "./web3authService";
import { rpc, tx, sc, u, wallet } from "@cityofzion/neon-js";
import { ethers } from "ethers";
import { getCurrentEnv } from "@/utils/env";
import { callWithRpcEndpointFallback } from "@/utils/rpcEndpoints";
import {
  isHash160Hex,
  normalizeHash160,
  normalizeInvokeArgsForRpc,
  normalizeSignersForRpc,
  normalizeSignMessageResult,
} from "@/utils/walletNormalization";
import aaMethodPolicy from "@/constants/aaMethodPolicy.json";

/** Supported wallet providers */
const PROVIDERS = {
  NEOLINE: "NeoLine",
  O3: "O3",
  ONEGATE: "OneGate",
  WALLETCONNECT: "WalletConnect",
  NEON: "Neon Wallet",
  TESTNET_WIF: "Testnet WIF (Local Dev)",
  WEB3AUTH: "Google / Email (Web3Auth)",
  EVM_WALLET: "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
};

/** Internal state */
let _connectedProvider = null;
let _account = null;
let _neolineN3 = null;
let _directWifAccount = null;
const AA_ALLOWED_META_METHODS = new Set(Array.isArray(aaMethodPolicy?.allowedMethods) ? aaMethodPolicy.allowedMethods : []);

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

/**
 * Check if O3 wallet is available.
 * O3 injects `window.neo3Dapi` or `window.NEOLineN3`.
 */
function unwrapNeoDapiProvider(candidate) {
  if (!candidate) return null;
  if (typeof candidate.getAccount === "function") return candidate;
  if (candidate.neo3Dapi && typeof candidate.neo3Dapi.getAccount === "function") {
    return candidate.neo3Dapi;
  }
  return null;
}

function getO3Dapi() {
  if (typeof window === "undefined") return null;
  return unwrapNeoDapiProvider(window.neo3Dapi);
}

function isO3Available() {
  return !!getO3Dapi();
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

/**
 * Check if an EVM Wallet is available.
 */
function isEthereumAvailable() {
  return typeof window !== "undefined" && window.ethereum !== undefined;
}

/**
 * Get the NeoLine N3 dapi instance.
 * NeoLine exposes N3 API via `new window.NEOLineN3.Init()`.
 */
async function getNeoLineN3() {
  if (_neolineN3) return _neolineN3;
  if (!hasNeoLineN3Api()) throw new Error("NeoLine extension not detected");
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

function isWalletNetworkCompatible(network) {
  const walletNetwork = String(network || "").toLowerCase();
  if (!walletNetwork) return true;

  if (isExplorerTestnet()) {
    return walletNetwork.includes("test") || walletNetwork.includes("t5");
  }

  return walletNetwork.includes("main");
}

function getDapiNetworkName() {
  return isExplorerTestnet() ? "N3TestNet" : "N3MainNet";
}

function getLegacyDapiNetworkAlias() {
  return isExplorerTestnet() ? "TestNet" : "MainNet";
}

export function getAbstractAccountHash() {
  const env = isExplorerTestnet() ? "TESTNET" : "MAINNET";
  const candidate = env === "TESTNET"
    ? (import.meta.env.VITE_AA_HASH_TESTNET || import.meta.env.VITE_AA_HASH)
    : (import.meta.env.VITE_AA_HASH_MAINNET || import.meta.env.VITE_AA_HASH);

  const normalized = normalizeHash160(candidate);
  return isHash160Hex(normalized) ? normalized : "";
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
    `${providerName} refused this request. Open ${providerName}, unlock it, approve this site, and retry.`
  );
}

function requestNeoLineAccount(n3, timeoutMs = 15000) {
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
      finishReject(new Error("NeoLine connection timed out."));
    }, timeoutMs);

    Promise.resolve()
      .then(() => n3.getAccount())
      .then((account) => {
        if (account?.address) {
          finishResolve(account);
          return;
        }
        finishReject(new Error("NeoLine returned no account."));
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

function requestNeoLineInvoke(n3, request, timeoutMs = 15000) {
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
      finishReject(new Error("NeoLine invocation timed out."));
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
    if (isDapiCanceled(err)) throw new Error("Connection canceled by user.");
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
      if (isDapiCanceled(retryErr)) throw new Error("Connection canceled by user.");
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
      PROVIDERS.O3,
      PROVIDERS.ONEGATE,
      PROVIDERS.WALLETCONNECT,
      PROVIDERS.NEON,
      PROVIDERS.WEB3AUTH,
      PROVIDERS.EVM_WALLET,
    ];
    if (isDirectWifProviderEnabled()) providers.push(PROVIDERS.TESTNET_WIF);
    return providers;
  },

  getAvailableProviders() {
    const providers = [];
    if (isNeoLineAvailable()) providers.push(PROVIDERS.NEOLINE);
    if (isO3Available()) providers.push(PROVIDERS.O3);
    if (isOneGateAvailable()) providers.push(PROVIDERS.ONEGATE);
    if (isEthereumAvailable()) providers.push(PROVIDERS.EVM_WALLET);
    if (isWalletConnectConfigured()) providers.push(PROVIDERS.WALLETCONNECT);
    if (isWalletConnectConfigured()) providers.push(PROVIDERS.NEON);
    if (isDirectWifProviderEnabled() && isExplorerTestnet()) providers.push(PROVIDERS.TESTNET_WIF);
    providers.push(PROVIDERS.WEB3AUTH);
    return [...new Set(providers)];
  },

  /**
   * Connect to a wallet provider.
   * @param {string} providerName - "NeoLine" or "O3"
   * @returns {Promise<{address: string, label: string}>}
   */
  async connect(providerName, options = {}) {
    if (providerName === PROVIDERS.NEOLINE) {
      await waitForNeoLine();
      const n3 = await getNeoLineN3();
      const account = await requestNeoLineAccount(n3);

      let networks = null;
      if (typeof n3.getNetworks === "function") {
        try {
          networks = await n3.getNetworks();
        } catch {
          networks = null;
        }
      }
      const walletNetwork = networks?.defaultNetwork || "";
      if (!isWalletNetworkCompatible(walletNetwork)) {
        console.warn(`Network mismatch during connect. Wallet is on ${walletNetwork}, but Explorer is on ${getCurrentEnv()}`);
        let switchSuccess = false;
        // Attempt to auto-switch the wallet to the correct network if the API supports it
        try {
          if (typeof n3.switchNetwork === "function") {
            const target = isExplorerTestnet() ? "N3TestNet" : "N3MainNet";
            await n3.switchNetwork({ network: target });
            switchSuccess = true;
          }
        } catch (e) {
          console.warn("Auto-switch network failed:", e);
        }

        if (!switchSuccess) {
          throw new Error(`Network mismatch. Switch your wallet to ${getCurrentEnv()} and try again.`);
        }
      }
      _connectedProvider = PROVIDERS.NEOLINE;
      _account = { address: account.address, label: account.label || "NeoLine" };
      return _account;
    }

    if (providerName === PROVIDERS.O3) {
      const dapi = getO3Dapi();
      if (!dapi) throw new Error("O3 wallet not detected");
      const account = await requestAccountWithDeniedRetry(PROVIDERS.O3, () => dapi.getAccount());

      let networks = null;
      if (typeof dapi.getNetworks === "function") {
        try {
          networks = await dapi.getNetworks();
        } catch {
          networks = null;
        }
      }
      const walletNetwork = networks?.defaultNetwork || "";
      if (!isWalletNetworkCompatible(walletNetwork)) {
        console.warn(`Network mismatch during connect. Wallet is on ${walletNetwork}, but Explorer is on ${getCurrentEnv()}`);
        let switchSuccess = false;
        try {
          if (typeof dapi.switchNetwork === "function") {
            const target = isExplorerTestnet() ? "TestNet" : "MainNet";
            await dapi.switchNetwork({ network: target });
            switchSuccess = true;
          }
        } catch (e) {
          console.warn("Auto-switch network failed:", e);
        }

        if (!switchSuccess) {
          throw new Error(`Network mismatch. Switch your wallet to ${getCurrentEnv()} and try again.`);
        }
      }
      _connectedProvider = PROVIDERS.O3;
      _account = { address: account.address, label: account.label || "O3" };
      return _account;
    }

    if (providerName === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      if (!dapi) throw new Error("OneGate wallet not detected");
      const account = await requestAccountWithDeniedRetry(PROVIDERS.ONEGATE, () => dapi.getAccount());

      let networks = null;
      if (typeof dapi.getNetworks === "function") {
        try {
          networks = await dapi.getNetworks();
        } catch {
          networks = null;
        }
      }
      const walletNetwork = networks?.defaultNetwork || "";
      if (!isWalletNetworkCompatible(walletNetwork)) {
        let switchSuccess = false;
        try {
          if (typeof dapi.switchNetwork === "function") {
            const target = isExplorerTestnet() ? "TestNet" : "MainNet";
            await dapi.switchNetwork({ network: target });
            switchSuccess = true;
          }
        } catch (e) {
          console.warn("Auto-switch network failed:", e);
        }

        if (!switchSuccess) {
          throw new Error(`Network mismatch. Switch your wallet to ${getCurrentEnv()} and try again.`);
        }
      }
      _connectedProvider = PROVIDERS.ONEGATE;
      _account = { address: account.address, label: account.label || PROVIDERS.ONEGATE };
      return _account;
    }

    if (providerName === PROVIDERS.TESTNET_WIF) {
      if (!isDirectWifProviderEnabled()) {
        throw new Error("Direct WIF testing is only available in local development.");
      }
      if (!isExplorerTestnet()) {
        throw new Error("Direct WIF testing is only allowed while the explorer is on testnet.");
      }

      const wif = String(options?.wif || "").trim();
      if (!wallet.isWIF(wif)) {
        throw new Error("Invalid WIF.");
      }

      const account = new wallet.Account(wif);
      _connectedProvider = PROVIDERS.TESTNET_WIF;
      _directWifAccount = account;
      _account = {
        address: account.address,
        label: PROVIDERS.TESTNET_WIF,
        persistSession: "session",
      };
      return _account;
    }

    if (providerName === PROVIDERS.WALLETCONNECT || providerName === PROVIDERS.NEON) {
      const projectId = getWalletConnectProjectId();
      if (!projectId) {
        throw new Error("WalletConnect is not configured. Set VITE_WC_PROJECT_ID to enable this wallet.");
      }
      await walletConnectService.init(projectId);
      const { uri, approval } = await walletConnectService.connect();
      return {
        uri,
        approval: approval.then(() => {
          _connectedProvider = providerName;
          _account = {
            ...(walletConnectService.account || {}),
            label: providerName,
          };
          return _account;
        }),
      };
    }

    if (providerName === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.connect();
      _connectedProvider = PROVIDERS.WEB3AUTH;
      _account = { address: account.address, label: "Web3Auth Account" };
      return _account;
    }

    if (providerName === PROVIDERS.EVM_WALLET) {
      if (!isEthereumAvailable()) throw new Error("EVM Wallet is not installed.");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) throw new Error("No EVM accounts found.");
      
      const evmAddress = accounts[0].toLowerCase();
      let uncompressedPubKey = localStorage.getItem(`evm_pubkey_${evmAddress}`);
      
      if (!uncompressedPubKey) {
        try {
          const signer = await provider.getSigner();
          const message = "Welcome to Neo N3 Explorer!\n\nPlease sign this message to derive your cross-chain Abstract Account identity. This operation does not cost any gas.";
          const signature = await signer.signMessage(message);
          const digest = ethers.hashMessage(message);
          uncompressedPubKey = ethers.SigningKey.recoverPublicKey(digest, signature).slice(2);
          localStorage.setItem(`evm_pubkey_${evmAddress}`, uncompressedPubKey);
        } catch (e) {
          throw new Error("Signature is required to generate your Abstract Account identity.");
        }
      }

      const aaHash = getAbstractAccountHash();
      const verifyScript = sc.createScript({
         scriptHash: aaHash,
         operation: 'verify',
         args: [ sc.ContractParam.byteArray(u.HexString.fromHex(uncompressedPubKey, false)) ]
      });
      const scriptHash = u.reverseHex(u.hash160(verifyScript));
      const neoAddress = wallet.getAddressFromScriptHash(scriptHash);

      _connectedProvider = PROVIDERS.EVM_WALLET;
      _account = { address: neoAddress, label: "EVM Wallet", pubKey: uncompressedPubKey, evmAddress };
      return _account;
    }

    throw new Error(`Unknown provider: ${providerName}`);
  },

  hydrateSession(providerName, account) {
    if (!providerName || !account?.address) {
      throw new Error("Invalid wallet session payload.");
    }
    _connectedProvider = providerName;
    _account = account;
  },

  async restoreSession(providerName, options = {}) {
    if (providerName === PROVIDERS.TESTNET_WIF) {
      const wif = String(options?.wif || "").trim();
      if (!wif) return null;
      return this.connect(providerName, { wif });
    }

    if (providerName !== PROVIDERS.NEON) return null;

    const projectId = getWalletConnectProjectId();
    if (!projectId) return null;

    await walletConnectService.init(projectId);
    const account = await walletConnectService.restoreSession();
    if (!account?.address) return null;

    _connectedProvider = providerName;
    _account = {
      ...account,
      label: providerName,
    };
    return _account;
  },

  /** Disconnect wallet */
  disconnect() {
    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      walletConnectService.disconnect();
    }
    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      web3authService.disconnect();
    }
    _connectedProvider = null;
    _account = null;
    _neolineN3 = null;
    _directWifAccount = null;
  },

  /**
   * Invoke a contract method (write operation, requires wallet signature).
   * @param {Object} params
   * @param {string} params.scriptHash - Contract hash (0x-prefixed)
   * @param {string} params.operation - Method name
   * @param {Array} params.args - Method arguments [{type, value}]
   * @returns {Promise<{txid: string}>}
   */

  async signRawTransaction(unsignedTxHex) {
    if (!_account) throw new Error("Wallet not connected");

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      if (typeof n3.signTransaction === 'function') {
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

         const res = await n3.signTransaction({ transaction: unsignedTxHex, network: expectedNetwork });
         return extractNeoLineSignature(res);
      }
      throw new Error("NeoLine does not support signTransaction.");
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.getAccount();
      // the unsigned tx hex needs to be hashed before signing
      const { tx } = await import('@cityofzion/neon-js');
      const transaction = tx.Transaction.deserialize(unsignedTxHex);
      const hash = transaction.hash();
      return account.sign(hash);
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF) {
      if (!_directWifAccount) throw new Error("Direct WIF account unavailable.");
      const transaction = tx.Transaction.deserialize(unsignedTxHex);
      const versionRes = await callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
        const rpcClient = new rpc.RPCClient(endpoint);
        return rpcClient.execute(new rpc.Query({ method: "getversion" }));
      });
      const magic = Number(versionRes?.protocol?.network);
      if (!Number.isFinite(magic)) {
        throw new Error("Failed to resolve network magic from RPC getversion.");
      }
      const payloadToSign = u.num2hexstring(magic, 4, true) + u.reverseHex(transaction.hash());
      return wallet.sign(payloadToSign, _directWifAccount.WIF);
    }
    
    throw new Error("Provider does not support raw transaction signing in browser.");
  },

  async signMessage(message) {
    if (!_account) throw new Error("Wallet not connected");

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      return normalizeSignMessageResult(await n3.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = getO3Dapi();
      return normalizeSignMessageResult(await dapi.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      return normalizeSignMessageResult(await dapi.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT || _connectedProvider === PROVIDERS.NEON) {
      return normalizeSignMessageResult(await walletConnectService.signMessage(message));
    }

    if (_connectedProvider === PROVIDERS.TESTNET_WIF) {
      if (!_directWifAccount) throw new Error("Direct WIF account unavailable.");
      const messageHex = u.str2hexstring(message);
      return normalizeSignMessageResult({
        publicKey: _directWifAccount.publicKey,
        data: wallet.sign(messageHex, _directWifAccount.WIF),
        salt: "",
        message,
      });
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.getAccount();
      // Emulate NeoLine's returned structure
      const messageHex = u.str2hexstring(message);
      const signature = account.sign(messageHex);
      return normalizeSignMessageResult({
        publicKey: account.publicKey,
        data: signature,
        salt: "",
        message: message
      });
    }

    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      return normalizeSignMessageResult({
        publicKey: "",
        data: signature,
        salt: "",
        message: message
      });
    }

    throw new Error("No wallet connected");
  },

  async invoke({ scriptHash, operation, args = [], scope = 1, signers = null, broadcastOverride = false }) {
    if (!_account) throw new Error("Wallet not connected");

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
        signers: dapiSigners
      };
      if (broadcastOverride) request.broadcastOverride = true;
      const result = await requestNeoLineInvoke(n3, request);
      // broadcastOverride returns { signedTx } instead of { txid }
      return broadcastOverride ? result : { txid: result.txid };
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = getO3Dapi();
      const requestBase = {
        scriptHash,
        operation,
        args: dapiArgs,
        signers: dapiSigners
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

    if (_connectedProvider === PROVIDERS.ONEGATE) {
      const dapi = getOneGateDapi();
      const requestBase = {
        scriptHash,
        operation,
        args: dapiArgs,
        signers: dapiSigners
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
      return walletConnectService.invoke({ scriptHash, operation, args: dapiArgs, signerScope: scope });
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

      const sb = new sc.ScriptBuilder();
      const mappedArgs = normalizedArgs.map((arg) => sc.ContractParam.fromJson(arg));
      sb.emitAppCall(scriptHash, operation, mappedArgs);
      const script = sb.build();

      return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
        const rpcClient = new rpc.RPCClient(endpoint);
        const currentHeight = await rpcClient.getBlockCount();
        const versionRes = await rpcClient.execute(new rpc.Query({ method: "getversion" }));
        const magic = Number(versionRes?.protocol?.network);
        if (!Number.isFinite(magic)) {
          throw new Error("Failed to resolve network magic from RPC getversion.");
        }
        const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), normalizedSigners);
        if (invokeRes.state === "FAULT") {
          throw new Error("Simulation Faulted: " + invokeRes.exception);
        }

        let txn = new tx.Transaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script,
          systemFee: invokeRes.gasconsumed || 1000000,
        });

        txn.sign(_directWifAccount, magic);
        const networkFee = await rpcClient.calculateNetworkFee(txn);

        txn = new tx.Transaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script,
          systemFee: invokeRes.gasconsumed || 1000000,
          networkFee,
        });
        txn.sign(_directWifAccount, magic);

        if (broadcastOverride) {
          return { signedTx: txn.serialize(true) };
        }

        return { txid: await rpcClient.sendRawTransaction(txn) };
      });
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
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

      const sb = new sc.ScriptBuilder();
      const mappedArgs = normalizedArgs.map((a) => sc.ContractParam.fromJson(a));
      sb.emitAppCall(scriptHash, operation, mappedArgs);
      const script = sb.build();

      return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
        const rpcClient = new rpc.RPCClient(endpoint);
        const currentHeight = await rpcClient.getBlockCount();
        const versionRes = await rpcClient.execute(new rpc.Query({ method: "getversion" }));
        const magic = Number(versionRes?.protocol?.network);
        if (!Number.isFinite(magic)) {
          throw new Error("Failed to resolve network magic from RPC getversion.");
        }
        const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), normalizedSigners);

        if (invokeRes.state === "FAULT") {
          throw new Error("Web3Auth Simulation Faulted: " + invokeRes.exception);
        }

        let txn = new tx.Transaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script: script,
          systemFee: invokeRes.gasconsumed || 1000000,
        });
        txn.sign(account, magic);

        const networkFee = await rpcClient.calculateNetworkFee(txn);

        // Resign with final explicit fees
        txn = new tx.Transaction({
          signers: normalizedSigners,
          validUntilBlock: currentHeight + 1000,
          script: script,
          systemFee: invokeRes.gasconsumed || 1000000,
          networkFee: networkFee
        });
        txn.sign(account, magic);

        if (broadcastOverride) {
          return { signedTx: txn.serialize(true) };
        }

        const txid = await rpcClient.sendRawTransaction(txn);
        return { txid };
      });
    }

    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      if (!isEthereumAvailable()) throw new Error("EVM Wallet is not installed.");

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
      const parsedOperation = assertAllowedAaMetaMethod(operation);
      
      let accountId = _account?.pubKey || localStorage.getItem(`evm_pubkey_${signerAddress}`);
      if (!accountId) {
          throw new Error("Missing public key identity. Please reconnect your EVM wallet.");
      }

      const verifyScript = sc.createScript({
        scriptHash: aaHash,
        operation: "verify",
        args: [sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false))],
      });
      const accountAddress = normalizeHash160(u.reverseHex(u.hash160(verifyScript)));
      if (!isHash160Hex(accountAddress)) {
        throw new Error("Unable to derive abstract account address.");
      }

      const prepareResponse = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          network: getCurrentEnv(),
          aaHash,
          accountAddress,
          accountId,
          signerAddress,
          targetContract: cleanTargetContract,
          method: parsedOperation,
          args: normalizedArgs
        })
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
      if (!prepared?.signerAddress) {
        throw new Error("Relayer prepare payload is missing signerAddress.");
      }
      const signature = await signer.signTypedData(prepared.domain, prepared.types, prepared.message);
      const digest = ethers.TypedDataEncoder.hash(prepared.domain, prepared.types, prepared.message);
      const uncompressedPubKey = ethers.SigningKey.recoverPublicKey(digest, signature);

      const executeResponse = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          network: getCurrentEnv(),
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
          uncompressedPubKey
        })
      });

      if (!executeResponse.ok) {
        const errData = await executeResponse.json();
        throw new Error(errData.error || "Relayer error");
      }

      const data = await executeResponse.json();
      return { txid: data.txid };
    }

    throw new Error("No wallet connected");
  },

  async simulateInvoke({ scriptHash, operation, args = [], scope = 1, signers = null }) {
    if (!_account) throw new Error("Wallet not connected");

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

    const sb = new sc.ScriptBuilder();
    const mappedArgs = normalizedArgs.map((a) => sc.ContractParam.fromJson(a));
    sb.emitAppCall(scriptHash, operation, mappedArgs);
    const script = sb.build();

    return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
      const rpcClient = new rpc.RPCClient(endpoint);
      return rpcClient.invokeScript(u.HexString.fromHex(script), normalizedSigners);
    });
  },

  async broadcastSignedTx(signedTx) {
    if (!signedTx) throw new Error("Signed transaction is empty.");
    return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
      const rpcClient = new rpc.RPCClient(endpoint);
      return rpcClient.sendRawTransaction(signedTx);
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

  if (!value || typeof value !== "object") return value;

  if (type === "Hash160" || type === "Hash256" || type === "PublicKey" || type === "Signature" || type === "ByteArray") {
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      return value.toString();
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

function extractNeoLineSignature(result) {
  if (!result || typeof result !== "object") {
    return result?.signature || result?.data;
  }

  if (typeof result.signature === "string" && result.signature) {
    return result.signature;
  }

  if (typeof result.data === "string" && result.data) {
    return result.data;
  }

  const invocationScript = String(result?.witnesses?.[0]?.invocationScript || "").trim();
  const match = invocationScript.match(/^(?:0c40|40)([0-9a-fA-F]{128})/);
  if (match) {
    return match[1];
  }

  return undefined;
}

export default walletService;
