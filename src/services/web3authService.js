import { Auth, LOGIN_PROVIDER, THEME_MODES, UX_MODE } from "@web3auth/auth";

let _web3auth = null;
let _chainConfigKey = null;

// Web3Auth client ID must be provided via VITE_WEB3AUTH_CLIENT_ID environment variable.
// Obtain one at https://dashboard.web3auth.io — never commit real client IDs to source.
const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "";

import { getCurrentEnv } from "@/utils/env";
import { getPrimaryRpcEndpoint } from "@/utils/rpcEndpoints";

const getChainConfigKey = () =>
  JSON.stringify({
    env: getCurrentEnv(),
    rpcTarget: getPrimaryRpcEndpoint(getCurrentEnv()),
    lang: typeof localStorage !== "undefined" ? localStorage.getItem("lang") || "en" : "en",
    dark: typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  });

export const web3authService = {
  /**
   * Initializes the Web3Auth auth SDK.
   */
  async init() {
    const chainConfigKey = getChainConfigKey();

    if (_web3auth && _chainConfigKey === chainConfigKey) return;

    if (_web3auth && _chainConfigKey !== chainConfigKey && _web3auth.connected) {
      try {
        await _web3auth.logout();
      } catch (_logoutError) {
        // best-effort reset when switching networks
      }
    }

    _web3auth = null;
    _chainConfigKey = null;

    try {
      const lang = localStorage.getItem("lang") || "en";
      const w3aLang = lang.startsWith("zh") ? "zh" : lang;

      _web3auth = new Auth({
        clientId,
        network: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet",
        uxMode: UX_MODE.POPUP,
        redirectUrl: typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}${window.location.pathname}` : undefined,
        sessionNamespace: getCurrentEnv(),
        whiteLabel: {
          appName: "Neo Explorer",
          defaultLanguage: w3aLang,
          // Web3Auth reads theme mode from whiteLabel, not the top-level Auth options.
          mode: THEME_MODES.DARK,
        },
      });
      await _web3auth.init();
      _chainConfigKey = chainConfigKey;
    } catch (e) {
      console.error("Web3Auth init failed:", e);
      throw e;
    }
  },

  /**
   * Connects via Web3Auth auth adapter and returns the Neo N3 Wallet Account
   */
  async connect(loginProvider = LOGIN_PROVIDER.GOOGLE) {
    await this.init();

    if (!_web3auth.privKey) {
      await _web3auth.login({ loginProvider });
    }
    return await this.getAccount();
  },

  /**
   * Extracts the private key and constructs a native neon-js Account
   */
  async getAccount() {
    const privateKeyHex = String(_web3auth?.privKey || "").trim();
    if (!privateKeyHex) return null;

    const { Account } = await import("@r3e/neo-js-sdk");
    const account = new Account(privateKeyHex);
    return account;
  },

  /**
   * Cleans up the session
   */
  async disconnect() {
    if (_web3auth?.sessionId) {
      await _web3auth.logout();
    }
  },
};
