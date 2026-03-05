import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { wallet } from "@cityofzion/neon-js";

let _web3auth = null;

// Replace with a default client ID or read from env.
// For demonstration, a placeholder is used. In production, provide VITE_WEB3AUTH_CLIENT_ID
const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BAFNBNPk7tUWbM9L6TBy7ixKCSQ3QwmQ7mCj0r3ai3KBA9ITqb3d7ifD0BV5YDs3NQCLPFU83MptKVc4T_xBMpo";

import { getCurrentEnv } from "@/utils/env";
import { getPrimaryRpcEndpoint } from "@/utils/rpcEndpoints";

const getChainConfig = () => {
  const isTestnet = getCurrentEnv().toLowerCase().includes("test") || getCurrentEnv().toLowerCase().includes("t5");

  return {
    chainNamespace: CHAIN_NAMESPACES.OTHER,
    chainId: isTestnet ? "0x3354" : "0x334E", // Hex representation for Testnet (13140) / Mainnet (13134)
    rpcTarget: getPrimaryRpcEndpoint(getCurrentEnv()),
    displayName: isTestnet ? "Neo N3 Testnet" : "Neo N3 Mainnet",
    blockExplorerUrl: "https://neo3scan.com",
    ticker: "GAS",
    tickerName: "Neo GAS",
    logo: "https://neo3scan.com/img/brand/neo.png",
  };
};

export const web3authService = {
  /**
   * Initializes the Web3Auth instance and its Modal UI
   */
  async init() {
    if (_web3auth) return;
    try {
      const privateKeyProvider = new CommonPrivateKeyProvider({
        config: { chainConfig: getChainConfig() },
      });

      const lang = localStorage.getItem("lang") || "en";
      const w3aLang = lang.startsWith('zh') ? 'zh' : lang; // Web3Auth supports 'en', 'de', 'ja', 'ko', 'zh', 'es', 'fr', 'pt', 'nl'

      const isDarkMode = document.documentElement.classList.contains("dark");

      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet",
        privateKeyProvider: privateKeyProvider,
        uiConfig: {
          defaultLanguage: w3aLang,
          mode: isDarkMode ? "dark" : "light",
          theme: {
            primary: "#00E599" // Neo green
          }
        }
      });

      await _web3auth.initModal();
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
    const account = new wallet.Account(privateKeyHex);
    return account;
  },

  /**
   * Cleans up the session
   */
  async disconnect() {
    if (_web3auth && _web3auth.connected) {
      await _web3auth.logout();
    }
  }
};
