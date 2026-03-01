/**
 * Wallet Service — NeoLine / O3 wallet integration for Neo N3
 * @module services/walletService
 * @description Detects browser wallet extensions and provides invoke/sign capabilities
 */

import { walletConnectService } from "./walletConnectService";
import { web3authService } from "./web3authService";
import { rpc, tx, sc, u } from "@cityofzion/neon-js";
import { ethers } from "ethers";
import { getCurrentEnv } from "@/utils/env";
import {
  isHash160Hex,
  normalizeHash160,
  normalizeInvokeArgsForRpc,
  normalizeSignersForRpc,
  normalizeSignMessageResult,
} from "@/utils/walletNormalization";

const getRpcUrl = () => {
  const env = getCurrentEnv().toLowerCase();
  if (env.includes("test") || env.includes("t5")) {
    const seeds = ["http://seed5t5.neo.org:20332", "http://seed2t5.neo.org:20332", "http://seed4t5.neo.org:20332"];
    return seeds[Math.floor(Math.random() * seeds.length)];
  }
  return "https://mainnet1.neo.coz.io:443";
};

/** Supported wallet providers */
const PROVIDERS = {
  NEOLINE: "NeoLine",
  O3: "O3",
  WALLETCONNECT: "WalletConnect",
  WEB3AUTH: "Google / Email (Web3Auth)",
  EVM_WALLET: "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
};

/** Internal state */
let _connectedProvider = null;
let _account = null;
let _neolineN3 = null;

/**
 * Check if NeoLine extension is available.
 * NeoLine injects `window.NEOLine` after page load.
 */
function isNeoLineAvailable() {
  return typeof window !== "undefined" && window.NEOLine !== undefined;
}

/**
 * Check if O3 wallet is available.
 * O3 injects `window.neo3Dapi` or `window.NEOLineN3`.
 */
function isO3Available() {
  return typeof window !== "undefined" && window.neo3Dapi !== undefined;
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
  if (!isNeoLineAvailable()) throw new Error("NeoLine extension not detected");
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
      window.removeEventListener("NEOLine.NEO.EVENT.READY", handler);
      resolve(true);
    };
    window.addEventListener("NEOLine.NEO.EVENT.READY", handler);
    setTimeout(() => {
      window.removeEventListener("NEOLine.NEO.EVENT.READY", handler);
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

function getAbstractAccountHash() {
  const env = isExplorerTestnet() ? "TESTNET" : "MAINNET";
  const candidate = env === "TESTNET"
    ? (import.meta.env.VITE_AA_HASH_TESTNET || import.meta.env.VITE_AA_HASH)
    : (import.meta.env.VITE_AA_HASH_MAINNET || import.meta.env.VITE_AA_HASH);

  const normalized = normalizeHash160(candidate);
  return isHash160Hex(normalized) ? normalized : "";
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
  return type === "CONNECTION_DENIED" || type === "CANCELED" || /refused to process this request|connection denied|user canceled|canceled/.test(msg);
}

function toConnectionDeniedError(providerName) {
  return new Error(
    `${providerName} refused this request. Open ${providerName}, unlock it, approve this site, and retry.`
  );
}

async function requestAccountWithDeniedRetry(providerName, getAccount, prepareRetry = null) {
  try {
    return await getAccount();
  } catch (err) {
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
      if (isDapiConnectionDenied(retryErr)) {
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
  getAvailableProviders() {
    const providers = [];
    if (isNeoLineAvailable()) providers.push(PROVIDERS.NEOLINE);
    if (isO3Available()) providers.push(PROVIDERS.O3);
    if (isEthereumAvailable()) providers.push(PROVIDERS.EVM_WALLET);
    providers.push(PROVIDERS.WALLETCONNECT); // always available
    providers.push(PROVIDERS.WEB3AUTH); // always available via web
    return providers;
  },

  /**
   * Connect to a wallet provider.
   * @param {string} providerName - "NeoLine" or "O3"
   * @returns {Promise<{address: string, label: string}>}
   */
  async connect(providerName) {
    if (providerName === PROVIDERS.NEOLINE) {
      await waitForNeoLine();
      let n3 = await getNeoLineN3();
      const account = await requestAccountWithDeniedRetry(
        PROVIDERS.NEOLINE,
        () => n3.getAccount(),
        async () => {
          _neolineN3 = null;
          n3 = await getNeoLineN3();
        }
      );

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
      const dapi = window.neo3Dapi;
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

    if (providerName === PROVIDERS.WALLETCONNECT) {
      await walletConnectService.init(import.meta.env.VITE_WC_PROJECT_ID || "");
      const { uri, approval } = await walletConnectService.connect();
      // Return URI + approval promise so caller can show modal while waiting
      return {
        uri,
        approval: approval.then(() => {
          _connectedProvider = PROVIDERS.WALLETCONNECT;
          _account = walletConnectService.account;
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
      _connectedProvider = PROVIDERS.EVM_WALLET;
      _account = { address: accounts[0], label: "EVM Wallet" };
      return _account;
    }

    throw new Error(`Unknown provider: ${providerName}`);
  },

  /** Disconnect wallet */
  disconnect() {
    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      walletConnectService.disconnect();
    }
    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      web3authService.disconnect();
    }
    _connectedProvider = null;
    _account = null;
    _neolineN3 = null;
  },

  /**
   * Invoke a contract method (write operation, requires wallet signature).
   * @param {Object} params
   * @param {string} params.scriptHash - Contract hash (0x-prefixed)
   * @param {string} params.operation - Method name
   * @param {Array} params.args - Method arguments [{type, value}]
   * @returns {Promise<{txid: string}>}
   */
  async signMessage(message) {
    if (!_account) throw new Error("Wallet not connected");

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      return normalizeSignMessageResult(await n3.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = window.neo3Dapi;
      return normalizeSignMessageResult(await dapi.signMessage({ message }));
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      return normalizeSignMessageResult(await walletConnectService.signMessage(message));
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

    const dapiArgs = args.map((a) => ({
      type: mapParamType(a.type),
      value: a.value,
    }));

    const defaultSignerAccount = normalizeHash160(_account.address);
    const invokeSigners = signers || [{ account: defaultSignerAccount, scopes: scope }];
    const dapiSigners = normalizeSignersForDapi(invokeSigners);

    const expectedNetwork = getDapiNetworkName();
    const legacyNetworkAlias = getLegacyDapiNetworkAlias();

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      const requestBase = {
        scriptHash,
        operation,
        args: dapiArgs,
        signers: dapiSigners
      };
      const invokeWithNetwork = async (network) => {
        const request = { ...requestBase, network };
        if (broadcastOverride) request.broadcastOverride = true;
        return n3.invoke(request);
      };

      let result;
      try {
        result = await invokeWithNetwork(expectedNetwork);
      } catch (err) {
        if (!isDapiConnectionDenied(err) || legacyNetworkAlias === expectedNetwork) {
          throw err;
        }
        result = await invokeWithNetwork(legacyNetworkAlias);
      }
      // broadcastOverride returns { signedTx } instead of { txid }
      return broadcastOverride ? result : { txid: result.txid };
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = window.neo3Dapi;
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
        if (!isDapiConnectionDenied(err) || legacyNetworkAlias === expectedNetwork) {
          throw err;
        }
        result = await invokeWithNetwork(legacyNetworkAlias);
      }
      return broadcastOverride ? result : { txid: result.txid };
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      // WalletConnect doesn't support broadcastOverride natively in the same way via Neo dAPI wrapper out of the box,
      // but we pass it anyway.
      return walletConnectService.invoke({ scriptHash, operation, args: dapiArgs, signerScope: scope });
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.getAccount();
      const rpcClient = new rpc.RPCClient(getRpcUrl());
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

      const currentHeight = await rpcClient.getBlockCount();
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

      const magic = getCurrentEnv().toLowerCase().includes("test") ? 894710606 : 860833102;
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

      const accountId = normalizeHash160(_account.address);
      if (!isHash160Hex(accountId)) {
        throw new Error("Invalid EVM account address.");
      }

      const prepareResponse = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          network: getCurrentEnv(),
          aaHash,
          accountId,
          targetContract: cleanTargetContract,
          method: String(operation),
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
          accountId,
          targetContract: cleanTargetContract,
          method: String(operation),
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

    const rpcClient = new rpc.RPCClient(getRpcUrl());
    return rpcClient.invokeScript(u.HexString.fromHex(script), normalizedSigners);
  },

  async broadcastSignedTx(signedTx) {
    if (!signedTx) throw new Error("Signed transaction is empty.");
    const rpcClient = new rpc.RPCClient(getRpcUrl());
    return rpcClient.sendRawTransaction(signedTx);
  },

};

/**
 * Map Neo ABI parameter types to dapi argument types.
 * @param {string} abiType - ABI type (e.g. "Integer", "Hash160", "String", "ByteArray", "Boolean")
 * @returns {string} dapi type
 */
function mapParamType(abiType) {
  const map = {
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

export default walletService;
