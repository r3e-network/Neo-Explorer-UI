/**
 * Wallet Service — NeoLine / O3 wallet integration for Neo N3
 * @module services/walletService
 * @description Detects browser wallet extensions and provides invoke/sign capabilities
 */

import { walletConnectService } from "./walletConnectService";
import { web3authService } from "./web3authService";
import { rpc, tx, sc, u } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";

const getRpcUrl = () => {
    const env = getCurrentEnv().toLowerCase();
    if (env.includes("test") || env.includes("t5")) {
        return "https://testnet1.neo.coz.io:443";
    }
    return "https://mainnet1.neo.coz.io:443";
};

/** Supported wallet providers */
const PROVIDERS = {
  NEOLINE: "NeoLine",
  O3: "O3",
  WALLETCONNECT: "WalletConnect",
  WEB3AUTH: "Google / Email (Web3Auth)",
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
      const n3 = await getNeoLineN3();
      const account = await n3.getAccount();
      _connectedProvider = PROVIDERS.NEOLINE;
      _account = { address: account.address, label: account.label || "NeoLine" };
      return _account;
    }

    if (providerName === PROVIDERS.O3) {
      const dapi = window.neo3Dapi;
      if (!dapi) throw new Error("O3 wallet not detected");
      const account = await dapi.getAccount();
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
      return await n3.signMessage({ message });
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = window.neo3Dapi;
      return await dapi.signMessage({ message });
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      return await walletConnectService.signMessage(message);
    }

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.getAccount();
      // Emulate NeoLine's returned structure
      const messageHex = u.str2hexstring(message);
      const signature = account.sign(messageHex);
      return {
         publicKey: account.publicKey,
         data: signature,
         salt: "",
         message: message
      };
    }

    throw new Error("No wallet connected");
  },

async invoke({ scriptHash, operation, args = [], scope = 1, signers = null, broadcastOverride = false }) {
    if (!_account) throw new Error("Wallet not connected");

    const dapiArgs = args.map((a) => ({
      type: mapParamType(a.type),
      value: a.value,
    }));

    const invokeSigners = signers || [{ account: _account.address, scopes: scope }];

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      const result = await n3.invoke({
        scriptHash,
        operation,
        args: dapiArgs,
        signers: invokeSigners,
        broadcastOverride
      });
      // broadcastOverride returns { signedTx } instead of { txid }
      return broadcastOverride ? result : { txid: result.txid };
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = window.neo3Dapi;
      const result = await dapi.invoke({
        scriptHash,
        operation,
        args: dapiArgs,
        signers: invokeSigners,
        broadcastOverride
      });
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

      const sb = new sc.ScriptBuilder();
      const mappedArgs = args.map(a => sc.ContractParam.fromJson(a));
      sb.emitAppCall(scriptHash, operation, mappedArgs);
      const script = sb.build();

      const currentHeight = await rpcClient.getBlockCount();
      const invokeRes = await rpcClient.invokeScript(script, invokeSigners);

      if (invokeRes.state === "FAULT") {
          throw new Error("Web3Auth Simulation Faulted: " + invokeRes.exception);
      }

      let txn = new tx.Transaction({
          signers: invokeSigners,
          validUntilBlock: currentHeight + 1000,
          script: script,
          systemFee: invokeRes.gasconsumed || 1000000,
      });

      const magic = getCurrentEnv().toLowerCase().includes("test") ? 894710606 : 860833102;
      txn.sign(account, magic);
      
      const networkFee = await rpcClient.calculateNetworkFee(txn);
      
      // Resign with final explicit fees
      txn = new tx.Transaction({
          signers: invokeSigners,
          validUntilBlock: currentHeight + 1000,
          script: script,
          systemFee: invokeRes.gasconsumed || 1000000,
          networkFee: networkFee
      });
      txn.sign(account, magic);

      if (broadcastOverride) {
         return { signedTx: txn.serialize(true) };
      }

      const txid = await rpcClient.sendRawTransaction(txn.serialize(true));
      return { txid };
    }

    throw new Error("No wallet connected");
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
