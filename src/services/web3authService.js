import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";

let _web3auth = null;
let _chainConfigKey = null;

// Web3Auth client ID must be provided via VITE_WEB3AUTH_CLIENT_ID environment variable.
// Obtain one at https://dashboard.web3auth.io — never commit real client IDs to source.
const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "";

import { getCurrentEnv } from "@/utils/env";
import { getPrimaryRpcEndpoint } from "@/utils/rpcEndpoints";

const getChainConfig = () => {
  const isTestnet = getCurrentEnv().toLowerCase().includes("test") || getCurrentEnv().toLowerCase().includes("t5");

  return {
    chainNamespace: CHAIN_NAMESPACES.OTHER,
    chainId: isTestnet ? "0x3354" : "0x334E", // Hex representation for Testnet (13140) / Mainnet (13134)
    rpcTarget: getPrimaryRpcEndpoint(getCurrentEnv()),
    displayName: isTestnet ? "Neo N3 Testnet" : "Neo N3 Mainnet",
    blockExplorerUrl: typeof window !== "undefined" ? window.location.origin : "https://neo3scan.com",
    ticker: "GAS",
    tickerName: "Neo GAS",
    logo: "https://neo3scan.com/img/brand/neo.png",
  };
};

const getChainConfigKey = (chainConfig = getChainConfig()) =>
  JSON.stringify({
    chainId: chainConfig.chainId,
    rpcTarget: chainConfig.rpcTarget,
    displayName: chainConfig.displayName,
  });

export const web3authService = {
  /**
   * Initializes the Web3Auth instance and its Modal UI
   */
  async init() {
    const chainConfig = getChainConfig();
    const chainConfigKey = getChainConfigKey(chainConfig);

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
      const privateKeyProvider = new CommonPrivateKeyProvider({
        config: { chainConfig },
      });

      const lang = localStorage.getItem("lang") || "en";
      const w3aLang = lang.startsWith("zh") ? "zh" : lang; // Web3Auth supports 'en', 'de', 'ja', 'ko', 'zh', 'es', 'fr', 'pt', 'nl'

      const isDarkMode = document.documentElement.classList.contains("dark");

      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet",
        privateKeyProvider: privateKeyProvider,
        uiConfig: {
          defaultLanguage: w3aLang,
          mode: isDarkMode ? "dark" : "light",
          theme: {
            primary: "#00E599", // Neo green
          },
        },
      });

      await _web3auth.initModal();
      _chainConfigKey = chainConfigKey;
    } catch (e) {
      console.error("Web3Auth init failed:", e);
      throw e;
    }
  },

  /**
   * Connects via Web3Auth Modal and returns the Neo N3 Wallet Account
   */
  async connect() {
    await this.init();

    let provider = _web3auth.provider;
    if (!_web3auth.connected) {
      provider = await _web3auth.connect();
    }

    if (!provider) throw new Error("Web3Auth provider not available");

    return await this.getAccount(provider);
  },

  /**
   * Extracts the private key and constructs a native neon-js Account
   */
  async getAccount(provider = _web3auth?.provider) {
    if (!provider) return null;

    // Web3Auth securely reconstructs the user's private key (entropy)
    const privateKeyHex = await provider.request({ method: "private_key" });

    // neon-js uses this raw 32-byte hex to generate valid secp256r1 N3 public keys and base58 addresses
    const { Account } = await import("@r3e/neo-js-sdk");
    const account = Account.fromPrivateKey(privateKeyHex);
    return account;
  },

  /**
   * Cleans up the session
   */
  async disconnect() {
    if (_web3auth && _web3auth.connected) {
      await _web3auth.logout();
    }
  },
};
