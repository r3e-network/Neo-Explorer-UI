import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { wallet } from "@cityofzion/neon-js";

let _web3auth = null;

// Replace with a default client ID or read from env.
// For demonstration, a placeholder is used. In production, provide VITE_WEB3AUTH_CLIENT_ID
const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiIQOAcQgLog7mFc0m_3tS90i6Ew6oNlE9Z4g"; 

export const web3authService = {
  /**
   * Initializes the Web3Auth instance and its Modal UI
   */
  async init() {
    if (_web3auth) return;
    try {
      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_devnet", // "sapphire_mainnet" for production
        chainConfig: {
          // Dummy generic EVM config just to satisfy Web3Auth's initial requirement.
          // We don't use this chain; we just extract the private key to derive a Neo N3 account.
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0x1",
          rpcTarget: "https://rpc.ankr.com/eth",
        },
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
