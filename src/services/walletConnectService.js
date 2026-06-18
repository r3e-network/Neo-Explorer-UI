/**
 * WalletConnect v2 service for Neo N3
 * @module services/walletConnectService
 */

import { getCurrentEnv, NET_ENV } from "@/utils/env";
import { isHash160Hex, normalizeHash160 } from "@/utils/walletNormalization";

function tWc(key, paramsOrFallback, fallbackMaybe) {
  const params = paramsOrFallback && typeof paramsOrFallback === "object" ? paramsOrFallback : {};
  const fallback = typeof paramsOrFallback === "string" ? paramsOrFallback : fallbackMaybe;
  const i18n = typeof globalThis !== "undefined" ? globalThis.__neoExplorerI18n__ : null;
  if (i18n?.global?.t) {
    const translated = i18n.global.t(key, params);
    if (translated && translated !== key) return translated;
  }
  return fallback;
}

const NEO_N3_METHODS = ["invokeFunction", "testInvoke", "signMessage"];
const NEO_N3_EVENTS = ["accountChanged", "accountsChanged"];

let _client = null;
let _session = null;
const _sessionListeners = new Set();

function getPreferredChain() {
  const env = getCurrentEnv().toLowerCase();
  if (env.includes("test") || env.includes(NET_ENV.TestT5.toLowerCase())) {
    return "neo3:testnet";
  }
  return "neo3:mainnet";
}

function chainToNetworkMode(chain) {
  const value = String(chain || "").toLowerCase();
  if (value.includes("test")) return "testnet";
  if (value.includes("main")) return "mainnet";
  return "";
}

function parseNeo3Account(account) {
  const parts = String(account || "").split(":");
  if (parts.length < 3 || parts[0] !== "neo3") return null;
  const [namespace, chain, ...addressParts] = parts;
  const address = addressParts.join(":").trim();
  if (!address) return null;
  return {
    raw: `${namespace}:${chain}:${address}`,
    chainId: `${namespace}:${chain}`,
    address,
  };
}

function getNeo3AccountEntries(session = _session) {
  const accounts = session?.namespaces?.neo3?.accounts || [];
  if (!Array.isArray(accounts)) return [];
  return accounts.map(parseNeo3Account).filter(Boolean);
}

function getPreferredSessionAccount(session = _session) {
  const entries = getNeo3AccountEntries(session);
  if (!entries.length) return null;
  const expectedChain = getPreferredChain();
  return entries.find((entry) => chainToNetworkMode(entry.chainId) === chainToNetworkMode(expectedChain)) || entries[0];
}

function notifySessionListeners(reason, error = null) {
  const account = getPreferredSessionAccount();
  const payload = {
    connected: !!_session,
    account: account?.address ? { address: account.address, label: "WalletConnect" } : null,
    session: _session,
    reason,
    error,
  };
  for (const listener of [..._sessionListeners]) {
    try {
      listener(payload);
    } catch {
      // Listener failures must not break WalletConnect event processing.
    }
  }
}

function assertSessionMatchesExplorerNetwork() {
  const sessionChain = getSessionChain();
  const expectedChain = getPreferredChain();
  if (!sessionChain) {
    throw new Error(
      tWc(
        "wallet.errors.walletConnectNoAccount",
        "WalletConnect session returned no Neo N3 account. Reconnect the wallet and try again.",
      ),
    );
  }
  if (chainToNetworkMode(sessionChain) === chainToNetworkMode(expectedChain)) return true;
  throw new Error(
    tWc(
      "wallet.errors.walletConnectNetworkMismatch",
      { sessionChain, expectedChain },
      `WalletConnect session is on ${sessionChain}; switch the Explorer to ${sessionChain.split(":")[1]} or reconnect on ${expectedChain}.`,
    ),
  );
}

function getSessionChain() {
  return getPreferredSessionAccount()?.chainId || null;
}

function getActiveChain() {
  return getSessionChain() || getPreferredChain();
}

function getActiveSignerAccount() {
  const account = getPreferredSessionAccount();
  return normalizeHash160(account?.address || "");
}

function getWalletConnectInvalidSignerError() {
  return new Error(
    tWc(
      "wallet.errors.walletConnectInvalidSigner",
      "WalletConnect could not resolve a valid signer account. Reconnect the wallet and try again.",
    ),
  );
}

function buildInvokeSigners(signers, signerScope) {
  const sourceSigners = Array.isArray(signers) && signers.length
    ? signers
    : [{ account: getActiveSignerAccount(), scopes: signerScope }];

  const normalizedSigners = sourceSigners.map((signer) => {
    if (!signer || typeof signer !== "object") return signer;
    return {
      ...signer,
      account: normalizeHash160(signer.account),
    };
  });

  if (normalizedSigners.some((signer) => !isHash160Hex(signer?.account))) {
    throw getWalletConnectInvalidSignerError();
  }

  return normalizedSigners;
}

function handleSessionDelete(event = {}) {
  if (!_session) return;
  const topic = event?.topic || event?.params?.topic || "";
  if (topic && topic !== _session.topic) return;
  _session = null;
  notifySessionListeners("session_delete");
}

function handleSessionUpdate(event = {}) {
  if (!_session) return;
  const topic = event?.topic || "";
  if (topic && topic !== _session.topic) return;
  const namespaces = event?.params?.namespaces;
  if (!namespaces || typeof namespaces !== "object") return;

  _session = { ..._session, namespaces };
  try {
    assertSessionMatchesExplorerNetwork();
    notifySessionListeners("session_update");
  } catch (error) {
    _session = null;
    notifySessionListeners("session_update", error);
  }
}

function sessionEventAccountsFromData(data, chainId) {
  if (Array.isArray(data)) {
    return data.flatMap((item) => sessionEventAccountsFromData(item, chainId));
  }

  if (data && typeof data === "object") {
    const candidate = data.account || data.address || data.accounts;
    return sessionEventAccountsFromData(candidate, chainId);
  }

  const value = String(data || "").trim();
  if (!value) return [];

  const parsed = parseNeo3Account(value);
  if (parsed) return [parsed.raw];

  return [`${chainId}:${value}`];
}

function accountFromSessionEventData(data, chainId) {
  const accounts = sessionEventAccountsFromData(data, chainId);
  if (!accounts.length) return "";

  const expectedMode = chainToNetworkMode(getPreferredChain());
  const matchingAccount = accounts.find((account) => {
    const parsed = parseNeo3Account(account);
    return parsed && chainToNetworkMode(parsed.chainId) === expectedMode;
  });
  return matchingAccount || accounts[0];
}

function handleSessionEvent(eventPayload = {}) {
  if (!_session) return;
  const topic = eventPayload?.topic || "";
  if (topic && topic !== _session.topic) return;

  const event = eventPayload?.event || eventPayload?.params?.event || {};
  const eventName = String(event?.name || "").toLowerCase();
  if (eventName !== "accountchanged" && eventName !== "accountschanged") return;

  const chainId = eventPayload?.chainId || eventPayload?.params?.chainId || getActiveChain();
  const account = accountFromSessionEventData(event?.data, chainId);
  if (!account) {
    _session = null;
    notifySessionListeners("accountChanged");
    return;
  }

  const namespaces = {
    ...(_session.namespaces || {}),
    neo3: {
      ...(_session.namespaces?.neo3 || {}),
      accounts: [account],
    },
  };
  _session = { ..._session, namespaces };
  try {
    assertSessionMatchesExplorerNetwork();
    notifySessionListeners("accountChanged");
  } catch (error) {
    _session = null;
    notifySessionListeners("accountChanged", error);
  }
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

    _client.on("session_delete", handleSessionDelete);
    _client.on("session_expire", handleSessionDelete);
    _client.on("session_update", handleSessionUpdate);
    _client.on("session_event", handleSessionEvent);
  },

  onSessionChange(listener) {
    if (typeof listener !== "function") return () => {};
    _sessionListeners.add(listener);
    return () => {
      _sessionListeners.delete(listener);
    };
  },

  /**
   * Propose a new session. Returns the pairing URI for the wallet.
   * @returns {Promise<{ uri: string, approval: Promise }>}
   */
  async connect() {
    if (!_client) throw new Error(tWc("wallet.errors.walletConnectNotInitialized", "WalletConnect not initialized"));
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
        try {
          assertSessionMatchesExplorerNetwork();
        } catch (error) {
          _session = null;
          throw error;
        }
        notifySessionListeners("connect");
        return session;
      }),
    };
  },

  restoreSession() {
    if (!_client) throw new Error(tWc("wallet.errors.walletConnectNotInitialized", "WalletConnect not initialized"));
    if (_session) return this.account;

    const sessions = typeof _client.session?.getAll === "function" ? _client.session.getAll() : [];
    const restoredSession = sessions.find((candidate) => {
      const accounts = candidate?.namespaces?.neo3?.accounts;
      return Array.isArray(accounts) && accounts.length > 0;
    });

    if (!restoredSession) return null;

    _session = restoredSession;
    try {
      assertSessionMatchesExplorerNetwork();
    } catch (error) {
      _session = null;
      throw error;
    }
    notifySessionListeners("restore");
    return this.account;
  },

  /**
   * Invoke a contract method via the connected wallet.
   */
  async signMessage(message) {
    if (!_session || !_client) throw new Error(tWc("wallet.errors.walletConnectNotConnected", "WalletConnect not connected"));
    assertSessionMatchesExplorerNetwork();
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
  async invoke({ scriptHash, operation, args = [], signerScope = 1, signers = null }) {
    if (!_session || !_client) throw new Error(tWc("wallet.errors.walletConnectNotConnected", "WalletConnect not connected"));
    assertSessionMatchesExplorerNetwork();
    const requestSigners = buildInvokeSigners(signers, signerScope);
    const result = await _client.request({
      topic: _session.topic,
      chainId: getActiveChain(),
      request: {
        method: "invokeFunction",
        params: { scriptHash, operation, args, signers: requestSigners },
      },
    });
    // Different WalletConnect-bridged wallets return either a bare txid
    // string or an object containing { txid, ... }. Pick the string form
    // so consumers always see { txid: "..." } rather than ending up with
    // { txid: { status: "ok" } } when a non-conforming wallet replies.
    if (typeof result === "string") return { txid: result };
    if (result && typeof result === "object" && typeof result.txid === "string") {
      return { txid: result.txid };
    }
    throw new Error(tWc("wallet.errors.walletConnectNoTxid", "WalletConnect returned no txid for invoke."));
  },

  disconnect() {
    if (_session && _client) {
      _client
        .disconnect({ topic: _session.topic, reason: { code: 6000, message: "User disconnected" } })
        .catch(() => {});
    }
    _session = null;
    notifySessionListeners("disconnect");
  },

  get isConnected() {
    return !!_session;
  },

  get account() {
    if (!_session) return null;
    const account = getPreferredSessionAccount();
    if (!account?.address) return null;
    return { address: account.address, label: "WalletConnect" };
  },

  ensureNetworkCompatible() {
    return assertSessionMatchesExplorerNetwork();
  },
};
