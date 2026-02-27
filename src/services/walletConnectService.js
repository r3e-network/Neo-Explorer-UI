/**
 * WalletConnect v2 service for Neo N3
 * @module services/walletConnectService
 */

import { getCurrentEnv, NET_ENV } from "@/utils/env";

const NEO_N3_METHODS = ["invokeFunction", "testInvoke", "signMessage"];
const NEO_N3_EVENTS = ["accountChanged"];

let _client = null;
let _session = null;

function getPreferredChain() {
  const env = getCurrentEnv().toLowerCase();
  if (env.includes("test") || env.includes(NET_ENV.TestT5.toLowerCase())) {
    return "neo3:testnet";
  }
  return "neo3:mainnet";
}

function getSessionChain() {
  const account = _session?.namespaces?.neo3?.accounts?.[0];
  if (!account) return null;
  const [namespace, chain] = account.split(":");
  if (!namespace || !chain) return null;
  return `${namespace}:${chain}`;
}

function getActiveChain() {
  return getSessionChain() || getPreferredChain();
}

export const walletConnectService = {
  /**
   * Initialize the SignClient. Lazy-loads @walletconnect/sign-client.
   * @param {string} projectId - WalletConnect Cloud project ID
   */
  async init(projectId) {
    if (_client) return;
    const { default: SignClient } = await import("@walletconnect/sign-client");
    _client = await SignClient.init({
      projectId,
      metadata: {
        name: "Neo Explorer",
        description: "Neo N3 Blockchain Explorer",
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    _client.on("session_delete", () => {
      _session = null;
    });
  },

  /**
   * Propose a new session. Returns the pairing URI for the wallet.
   * @returns {Promise<{ uri: string, approval: Promise }>}
   */
  async connect() {
    if (!_client) throw new Error("WalletConnect not initialized");
    const { uri, approval } = await _client.connect({
      requiredNamespaces: {
        neo3: {
          chains: [getPreferredChain()],
          methods: NEO_N3_METHODS,
          events: NEO_N3_EVENTS,
        },
      },
    });
    return {
      uri,
      approval: approval().then((session) => {
        _session = session;
        return session;
      }),
    };
  },

  /**
   * Invoke a contract method via the connected wallet.
   */
  async signMessage(message) {
    if (!_session || !_client) throw new Error("WalletConnect not connected");
    return await _client.request({
      topic: _session.topic,
      chainId: getActiveChain(),
      request: {
        method: "signMessage",
        params: { message }
      }
    });
  },

  /**
   * Invoke a contract method via the connected wallet.
   */
  async invoke({ scriptHash, operation, args = [], signerScope = 1 }) {
    if (!_session || !_client) throw new Error("WalletConnect not connected");
    const result = await _client.request({
      topic: _session.topic,
      chainId: getActiveChain(),
      request: {
        method: "invokeFunction",
        params: { scriptHash, operation, args, signers: [{ scopes: signerScope }] },
      },
    });
    return { txid: result.txid || result };
  },

  disconnect() {
    if (_session && _client) {
      _client
        .disconnect({ topic: _session.topic, reason: { code: 6000, message: "User disconnected" } })
        .catch(() => {});
    }
    _session = null;
  },

  get isConnected() {
    return !!_session;
  },

  get account() {
    if (!_session) return null;
    const accounts = _session.namespaces?.neo3?.accounts || [];
    if (!accounts.length) return null;
    // Format: "neo3:mainnet:NAddress"
    const address = accounts[0].split(":")[2];
    return { address, label: "WalletConnect" };
  },
};
