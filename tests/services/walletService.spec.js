import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({ value: "Mainnet" }));
const web3AuthAccount = {
  address: "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf",
  publicKey: "03e66f7f5f327f7eb5c11bfb2bde0864e80f98f2f0f9f4f23ae86f0fd82d4f0f60",
  sign: vi.fn(() => "signed-message"),
};

const connectMock = vi.fn(async () => web3AuthAccount);
const getAccountMock = vi.fn(async () => web3AuthAccount);

const invokeScriptMock = vi.fn(async (_params) => {
  return { state: "HALT", gasconsumed: "100000" };
});
const getBlockCountMock = vi.fn(async () => 123456);
const calculateNetworkFeeMock = vi.fn(async () => "1000");
const sendRawTransactionMock = vi.fn(async () => "0xtesttxid");
const executeMock = vi.fn(async () => ({ protocol: { network: 860833102 } }));
const getVersionMock = vi.fn(async () => ({ protocol: { network: 860833102 } }));
const signTxMock = vi.fn();
const compatTxDeserializeMock = vi.fn();
const neoLineInvokeMock = vi.fn(async () => ({ txid: "0xneoline" }));
const neoLineSignTransactionMock = vi.fn(async () => ({ signature: "neoline-signature" }));
const neoLineGetPublicKeyMock = vi.fn(async () => ({
  publicKey: "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
}));
const neoLineSwitchNetworkMock = vi.fn(async () => ({ defaultNetwork: "N3TestNet" }));
const neoLineSwitchWalletAccountMock = vi.fn(async () => ({
  address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
  label: "NeoLine",
}));
const neoLineGetNetworksMock = vi.fn(async () => ({ defaultNetwork: "MainNet" }));
const neoLineGetAccountMock = vi.fn(async () => ({
  address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
  label: "NeoLine",
}));
const oneGateInvokeMock = vi.fn(async () => ({ txid: "0xonegate" }));
const oneGateGetNetworksMock = vi.fn(async () => ({ defaultNetwork: "MainNet" }));
const oneGateGetAccountMock = vi.fn(async () => ({
  address: "Nbb4ZVd4VZ8fcwZQ7k3NQ5Nus4C7Ew6S4Y",
  label: "OneGate",
}));
const walletConnectInitMock = vi.fn();
const walletConnectConnectMock = vi.fn(async () => ({
  uri: "wc:test-uri",
  approval: Promise.resolve(),
}));
const walletConnectInvokeMock = vi.fn(async () => ({ txid: "0xwalletconnect" }));
const walletConnectSignMessageMock = vi.fn(async () => ({ data: "wc-signature" }));
const walletConnectDisconnectMock = vi.fn();
const walletConnectRestoreSessionMock = vi.fn(async () => null);
const walletConnectOnSessionChangeMock = vi.fn((handler) => {
  walletConnectSessionChangeHandler = handler;
  return vi.fn();
});
let walletConnectSessionChangeHandler = null;
const walletConnectAccount = { address: "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs", label: "WalletConnect" };
const walletConnectScriptHash = "a5de523ae9d99be784a536e9412b7a3cbe049e1a";
const directWifHexSignMock = vi.fn(() => "f".repeat(128));
const DIRECT_WIF = "LtestDirectWif11111111111111111111111111111111111111111111";

class MockRpcClient {
  async getBlockCount() {
    return getBlockCountMock();
  }

  async invokeScript(params) {
    return invokeScriptMock(params);
  }

  async calculateNetworkFee(txn) {
    return calculateNetworkFeeMock(txn);
  }

  async sendRawTransaction(payload) {
    return sendRawTransactionMock(payload);
  }

  async execute(query) {
    return executeMock(query);
  }

  async getVersion() {
    return getVersionMock();
  }
}

class MockTransaction {
  constructor(data = {}) {
    this.data = data;
  }

  static deserialize() {
    return new MockTransaction();
  }

  hash() {
    return "abcd";
  }

  sign(account, magic) {
    signTxMock(account, magic);
  }

  serialize() {
    return "serialized-transaction";
  }
}

class MockCompatTransaction extends MockTransaction {
  static deserialize(...args) {
    compatTxDeserializeMock(...args);
    return MockTransaction.deserialize(...args);
  }
}

class MockScriptBuilder {
  emitAppCall() {
    return this;
  }

  emitContractCall() {
    return this;
  }

  build() {
    return "51";
  }

  toHex() {
    return "51";
  }

  toBytes() {
    return "13ef519c362973f9a34648a9eac5b71250b2a80a";
  }
}

class MockWalletAccount {
  constructor(input) {
    const value = String(input || "");
    this.WIF = value;
    this.privateKey = `${value}-private`;
    this.publicKey = `${value}-public`;

    if (value === "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu") {
      this.address = "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu";
      this.scriptHash = "13ef519c362973f9a34648a9eac5b71250b2a80a";
      return;
    }

    if (value === DIRECT_WIF) {
      this.address = "NTestWifAccount111111111111111111111";
      this.scriptHash = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
      return;
    }

    this.address = `N${value.slice(0, 33)}`;
    this.scriptHash = value.replace(/^0x/i, "").toLowerCase();
  }

  sign(data) {
    return directWifHexSignMock(data);
  }
}

vi.mock("@cityofzion/neon-js", () => {
  const neonMock = {
    RpcClient: MockRpcClient,
    Tx: MockTransaction,
    Account: class MockAccount extends MockWalletAccount {
      static fromWIF(wif) {
        return new MockAccount(wif);
      }
    },
    ScriptBuilder: MockScriptBuilder,
    reverseHex: (value) => value,
    hash160: (value) => value,
    str2hexstring: (value) => value,
    num2hexstring: (value) => value.toString(16),
    hexToBytes: (hex) => {
      const buffer = Buffer.from(hex, "hex");
      return {
        ...buffer,
        toBase64: () => buffer.toString("base64"),
      };
    },
    bytesToHex: (bytes) => Buffer.from(bytes).toString("hex"),
    bytesToBase64: (bytes) => Buffer.from(bytes).toString("base64"),
    base64ToBytes: (b64) => Buffer.from(b64, "base64"),
    scriptHashToAddress: (value) => `N${String(value).replace(/^0x/i, "").slice(0, 33)}`,
    addressToScriptHash: (value) => {
      if (value === "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu") return "0x13ef519c362973f9a34648a9eac5b71250b2a80a";
      if (value === "NTestWifAccount111111111111111111111") return "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      return `0x${value.slice(1)}`;
    },
    deserialize: () => new MockTransaction(),
    WitnessScope: { Global: 128, CalledByEntry: 1 },
    rpc: { RPCClient: MockRpcClient },
    tx: {
      Transaction: MockCompatTransaction,
      WitnessScope: { Global: 128, CalledByEntry: 1 },
    },
  };
  neonMock.wallet = {
    Account: neonMock.Account,
    getSignaturesFromInvocationScript: vi.fn((invocationScript) => {
      const match = String(invocationScript || "").match(/^(?:0c40|40)([0-9a-fA-F]{128})/);
      return match ? [match[1]] : [];
    }),
    getPublicKeyFromVerificationScript: vi.fn((verificationScript) => {
      const match = String(verificationScript || "").match(/(?:0c21|21)(0[23][0-9a-fA-F]{64})/i);
      return match ? match[1] : "";
    }),
  };
  neonMock.u = {
    num2hexstring: neonMock.num2hexstring,
    reverseHex: neonMock.reverseHex,
    hash160: neonMock.hash160,
    str2hexstring: neonMock.str2hexstring,
  };
  neonMock.sc = {
    ScriptBuilder: neonMock.ScriptBuilder,
  };
  neonMock.default = neonMock;
  return neonMock;
});

vi.mock("../../src/services/walletConnectService.js", () => ({
  walletConnectService: {
    init: walletConnectInitMock,
    connect: walletConnectConnectMock,
    restoreSession: walletConnectRestoreSessionMock,
    get account() {
      return walletConnectAccount;
    },
    invoke: walletConnectInvokeMock,
    signMessage: walletConnectSignMessageMock,
    disconnect: walletConnectDisconnectMock,
    onSessionChange: walletConnectOnSessionChangeMock,
  },
}));

vi.mock("../../src/services/web3authService.js", () => ({
  web3authService: {
    init: vi.fn(),
    connect: connectMock,
    getAccount: getAccountMock,
    disconnect: vi.fn(),
  },
}));

vi.mock("../../src/utils/env.js", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getActiveBasePath: (env) => (env === "TestT5" ? "/rpc/testnet/primary" : "/rpc/mainnet/primary"),
  getCurrentEnv: () => envState.value,
  getConfiguredRpcBaseUrl: () => "",
  setActiveBasePath: vi.fn(),
  toAbsoluteUrl: (value) => value,
}));

describe("walletService", () => {
  afterEach(() => {
    vi.doUnmock("ethers");
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("VITE_WC_PROJECT_ID", "test-project-id");
    vi.stubEnv("VITE_WEB3AUTH_CLIENT_ID", "test-web3auth-client-id");
    envState.value = "Mainnet";
    compatTxDeserializeMock.mockReset();
    executeMock.mockResolvedValue({ protocol: { network: 860833102 } });
    getVersionMock.mockResolvedValue({ protocol: { network: 860833102 } });
    neoLineGetNetworksMock.mockReset().mockResolvedValue({ defaultNetwork: "MainNet" });
    neoLineSwitchNetworkMock.mockReset().mockImplementation(async ({ network }) => {
      neoLineGetNetworksMock.mockResolvedValue({ defaultNetwork: network });
      return { defaultNetwork: network };
    });
    neoLineSwitchWalletAccountMock.mockReset().mockResolvedValue({
      address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
      label: "NeoLine",
    });
    delete window.NEOLine;
    delete window.NEOLineN3;
    delete window.OneGate;
    delete window.neo;
    delete window.ethereum;
    localStorage.clear();
    walletConnectSessionChangeHandler = null;
    walletConnectOnSessionChangeMock.mockClear();
  });

  async function seedOneGateNetworkError(walletService, walletState) {
    envState.value = "Mainnet";
    window.OneGate = {
      getAccount: oneGateGetAccountMock,
      getNetworks: oneGateGetNetworksMock,
      invoke: oneGateInvokeMock,
      switchNetwork: vi.fn(),
    };

    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.ONEGATE);

    oneGateGetAccountMock.mockResolvedValueOnce({
      address: "NChangedOneGateAccount11111111111111111",
      label: "OneGate",
    });

    await expect(walletService.ensureNetworkConsistency()).rejects.toThrow(/OneGate account changed/i);
    expect(walletState.walletNetworkError.value).toMatch(/OneGate account changed/i);

    walletService.disconnect();
    expect(walletState.walletNetworkError.value).toBe("");
  }

  it("converts script to HexString/base64 before invokescript RPC and sends Transaction object for broadcast", async () => {
    const { walletService } = await import("../../src/services/walletService.js");

    await walletService.connect(walletService.PROVIDERS.WEB3AUTH);

    const result = await walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "vote",
      args: [
        { type: "Hash160", value: "a62eb3c767ef3d39d98c704f70fc4e869349a6fd" },
        { type: "PublicKey", value: "03c95f8e6fe4f6e9de4dbf67bf3ff47a1465644d0f32956543e12b3d6b0ffb02d7" },
      ],
      signers: [{ account: "a62eb3c767ef3d39d98c704f70fc4e869349a6fd", scopes: 1 }],
    });

    expect(result).toEqual({ txid: "0xtesttxid" });
    expect(invokeScriptMock).toHaveBeenCalledTimes(1);
    const [params] = invokeScriptMock.mock.calls[0];
    expect(typeof params.script).toBe("string");
    expect(params.script).toBe("51");
    expect(sendRawTransactionMock).toHaveBeenCalledTimes(1);
  });

  it("broadcasts signed transaction via RPC client", async () => {
    const { walletService } = await import("../../src/services/walletService.js");

    await walletService.connect(walletService.PROVIDERS.WEB3AUTH);
    const txid = await walletService.broadcastSignedTx("serialized-transaction");

    expect(sendRawTransactionMock).toHaveBeenCalledWith({ tx: "serialized-transaction" });
    expect(txid).toBe("0xtesttxid");
  });

  it("returns the full supported provider list regardless of availability", async () => {
    vi.stubEnv("VITE_WC_PROJECT_ID", "");
    const { walletService } = await import("../../src/services/walletService.js");

    const providers = walletService.getSupportedProviders();
    expect(providers).toContain(walletService.PROVIDERS.NEOLINE);
    expect(providers).toContain(walletService.PROVIDERS.WEB3AUTH);
    expect(providers).toContain(walletService.PROVIDERS.EVM_WALLET);
  });

  it("hides WalletConnect-style providers when project id is missing", async () => {
    vi.stubEnv("VITE_WC_PROJECT_ID", "");
    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getAvailableProviders()).not.toContain(walletService.PROVIDERS.WALLETCONNECT);
    expect(walletService.getAvailableProviders()).not.toContain(walletService.PROVIDERS.NEON);
  });

  it("hides Web3Auth when its client id is missing", async () => {
    vi.stubEnv("VITE_WEB3AUTH_CLIENT_ID", "");
    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getSupportedProviders()).toContain(walletService.PROVIDERS.WEB3AUTH);
    expect(walletService.getAvailableProviders()).not.toContain(walletService.PROVIDERS.WEB3AUTH);
  });

  it("rejects direct Web3Auth connect attempts when the client id is missing", async () => {
    vi.stubEnv("VITE_WEB3AUTH_CLIENT_ID", "");
    const { walletService } = await import("../../src/services/walletService.js");

    await expect(walletService.connect(walletService.PROVIDERS.WEB3AUTH)).rejects.toThrow(
      /Web3Auth is not configured/i,
    );
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("lists Neon Wallet as a supported provider alongside WalletConnect when configured", async () => {
    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getAvailableProviders()).toEqual(
      expect.arrayContaining([
        walletService.PROVIDERS.WALLETCONNECT,
        walletService.PROVIDERS.NEON,
        walletService.PROVIDERS.WEB3AUTH,
      ]),
    );
  });

  it("lists the direct testnet WIF provider only when the explorer is on testnet", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getSupportedProviders()).toContain(walletService.PROVIDERS.TESTNET_WIF);
    expect(walletService.getAvailableProviders()).toContain(walletService.PROVIDERS.TESTNET_WIF);
  });

  it("reports Neo-native providers as supported for NeoChat auth", async () => {
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
          signMessage: vi.fn(async () => ({ publicKey: neoLineGetAccountMock().publicKey, data: "sig" })),
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    expect(walletService.getChatAuthSupport()).toEqual({ supported: true, reason: "" });
  });

  it("reports EVM wallets as unsupported for NeoChat auth", async () => {
    window.ethereum = {
      request: vi.fn(),
    };
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      pubKey: "04deadbeef",
      evmAddress: "0xabc",
    });

    expect(walletService.getChatAuthSupport()).toEqual({
      supported: false,
      reason: "NeoChat is not yet supported for EVM wallet connections. Use a Neo-native wallet or Testnet WIF.",
    });
  });

  it("connects an EVM wallet, derives its Neo address, and clears stale wallet network errors", async () => {
    vi.stubEnv("VITE_AA_HASH_MAINNET", `0x${"ab".repeat(20)}`);
    const evmAddress = "0xabc0000000000000000000000000000000000000";
    const recoveredPublicKey = `04${"11".repeat(64)}`;
    const evmSignMessageMock = vi.fn(async () => "0xidentity-signature");
    const computeAddressMock = vi.fn(() => evmAddress);
    const hashMessageMock = vi.fn(() => "0xidentity-digest");
    const recoverPublicKeyMock = vi.fn(() => `0x${recoveredPublicKey}`);
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: class MockBrowserProvider {
          async send(method) {
            return method === "eth_requestAccounts" ? [evmAddress] : [];
          }

          async getSigner() {
            return {
              signMessage: evmSignMessageMock,
            };
          }
        },
        computeAddress: computeAddressMock,
        hashMessage: hashMessageMock,
        SigningKey: {
          recoverPublicKey: recoverPublicKeyMock,
        },
      },
    }));
    window.ethereum = {
      on: vi.fn(),
      removeListener: vi.fn(),
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");

    await seedOneGateNetworkError(walletService, walletState);
    const account = await walletService.connect(walletService.PROVIDERS.EVM_WALLET);

    expect(account.label).toBe("EVM Wallet");
    expect(account.evmAddress).toBe(evmAddress);
    expect(account.pubKey).toBe(recoveredPublicKey);
    expect(account.address).toMatch(/^N/);
    expect(walletService.provider).toBe(walletService.PROVIDERS.EVM_WALLET);
    expect(walletState.connectedAccount.value).toBe(account.address);
    expect(walletState.walletNetworkError.value).toBe("");
    expect(evmSignMessageMock).toHaveBeenCalledTimes(1);
    expect(hashMessageMock).toHaveBeenCalledWith(expect.stringContaining("Network: N3MainNet"));
    expect(recoverPublicKeyMock).toHaveBeenCalledWith("0xidentity-digest", "0xidentity-signature");
    expect(computeAddressMock).toHaveBeenCalledWith(`0x${recoveredPublicKey}`);
    expect(window.ethereum.on).toHaveBeenCalledWith("accountsChanged", expect.any(Function));
    expect(window.ethereum.on).toHaveBeenCalledWith("chainChanged", expect.any(Function));
  });

  it("keeps a new NeoLine session alive when stale EVM wallet events fire after switching providers", async () => {
    vi.stubEnv("VITE_AA_HASH_MAINNET", `0x${"ab".repeat(20)}`);
    const evmAddress = "0xabc0000000000000000000000000000000000000";
    const recoveredPublicKey = `04${"11".repeat(64)}`;
    const evmListeners = new Map();
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: class MockBrowserProvider {
          async send(method) {
            return method === "eth_requestAccounts" ? [evmAddress] : [];
          }

          async getSigner() {
            return {
              signMessage: vi.fn(async () => "0xidentity-signature"),
            };
          }
        },
        computeAddress: vi.fn(() => evmAddress),
        hashMessage: vi.fn(() => "0xidentity-digest"),
        SigningKey: {
          recoverPublicKey: vi.fn(() => `0x${recoveredPublicKey}`),
        },
      },
    }));
    window.ethereum = {
      on: vi.fn((event, handler) => {
        evmListeners.set(event, handler);
      }),
      removeListener: vi.fn((event, handler) => {
        if (evmListeners.get(event) === handler) evmListeners.delete(event);
      }),
    };
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");

    await walletService.connect(walletService.PROVIDERS.EVM_WALLET);
    expect(evmListeners.has("accountsChanged")).toBe(true);
    await walletService.connect(walletService.PROVIDERS.NEOLINE);
    expect(walletService.provider).toBe(walletService.PROVIDERS.NEOLINE);

    evmListeners.get("accountsChanged")?.(["0xdef0000000000000000000000000000000000000"]);

    expect(walletService.provider).toBe(walletService.PROVIDERS.NEOLINE);
    expect(walletService.account).toEqual({
      address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
      label: "NeoLine",
    });
    expect(walletState.connectedWalletProvider.value).toBe(walletService.PROVIDERS.NEOLINE);
    expect(walletState.connectedAccount.value).toBe("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");
    expect(localStorage.getItem("walletProvider")).toBe(walletService.PROVIDERS.NEOLINE);
  });

  it("rejects EVM wallet connection before prompting for a signature when the AA hash is missing", async () => {
    vi.stubEnv("VITE_AA_HASH_MAINNET", "");
    vi.stubEnv("VITE_AA_HASH", "");
    const browserProviderMock = vi.fn();
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: browserProviderMock,
      },
    }));
    window.ethereum = {
      request: vi.fn(),
    };

    const { walletService } = await import("../../src/services/walletService.js");

    await expect(walletService.connect(walletService.PROVIDERS.EVM_WALLET)).rejects.toThrow(
      /Abstract account contract hash is not configured/i,
    );
    expect(browserProviderMock).not.toHaveBeenCalled();
    expect(window.ethereum.request).not.toHaveBeenCalled();
  });

  it("blocks EVM AA invokes when the relayer prepares a payload for the wrong Neo network", async () => {
    vi.stubEnv("VITE_AA_HASH_MAINNET", `0x${"ab".repeat(20)}`);
    const evmSignTypedDataMock = vi.fn(async () => "0xsigned");
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: class MockBrowserProvider {
          async getSigner() {
            return {
              getAddress: vi.fn(async () => "0xabc"),
              signTypedData: evmSignTypedDataMock,
            };
          }
        },
      },
    }));
    window.ethereum = {
      request: vi.fn(async ({ method }) => (method === "eth_accounts" ? ["0xabc"] : null)),
    };
    const relayerFetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        domain: {
          chainId: 894710606,
          verifyingContract: `0x${"ab".repeat(20)}`,
        },
        types: {
          MetaTx: [{ name: "argsHash", type: "bytes32" }],
        },
        message: {
          argsHash: `0x${"11".repeat(32)}`,
          deadline: Math.floor(Date.now() / 1000) + 60,
          nonce: "1",
        },
        signerAddress: "0xabc",
      }),
    }));
    vi.stubGlobal("fetch", relayerFetchMock);

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      pubKey: `04${"11".repeat(64)}`,
      evmAddress: "0xabc",
    });

    await expect(walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "transfer",
      args: [],
    })).rejects.toThrow(/Explorer is on N3MainNet/i);
    expect(evmSignTypedDataMock).not.toHaveBeenCalled();
    expect(relayerFetchMock).toHaveBeenCalledTimes(1);
    expect(walletState.walletNetworkError.value).toMatch(/Explorer is on N3MainNet/i);
  });

  it("blocks EVM AA invokes when the relayer prepares a payload for a different AA contract", async () => {
    vi.stubEnv("VITE_AA_HASH_MAINNET", `0x${"ab".repeat(20)}`);
    const evmSignTypedDataMock = vi.fn(async () => "0xsigned");
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: class MockBrowserProvider {
          async getSigner() {
            return {
              getAddress: vi.fn(async () => "0xabc"),
              signTypedData: evmSignTypedDataMock,
            };
          }
        },
      },
    }));
    window.ethereum = {
      request: vi.fn(async ({ method }) => (method === "eth_accounts" ? ["0xabc"] : null)),
    };
    const relayerFetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        domain: {
          chainId: 860833102,
          verifyingContract: `0x${"cd".repeat(20)}`,
        },
        types: {
          MetaTx: [{ name: "argsHash", type: "bytes32" }],
        },
        message: {
          argsHash: `0x${"11".repeat(32)}`,
          deadline: Math.floor(Date.now() / 1000) + 60,
          nonce: "1",
        },
        signerAddress: "0xabc",
      }),
    }));
    vi.stubGlobal("fetch", relayerFetchMock);

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      pubKey: `04${"11".repeat(64)}`,
      evmAddress: "0xabc",
    });

    await expect(walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "transfer",
      args: [],
    })).rejects.toThrow(/different Abstract Account contract/i);
    expect(evmSignTypedDataMock).not.toHaveBeenCalled();
    expect(relayerFetchMock).toHaveBeenCalledTimes(1);
    expect(walletState.walletNetworkError.value).toMatch(/different Abstract Account contract/i);
  });

  it("blocks EVM signing when the wallet account is locked or no longer authorized", async () => {
    window.ethereum = {
      request: vi.fn(async ({ method }) => (method === "eth_accounts" ? [] : null)),
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      evmAddress: "0xabc",
    });

    await expect(walletService.signMessage("hello")).rejects.toThrow(
      /EVM wallet account is no longer available/i,
    );
    expect(window.ethereum.request).toHaveBeenCalledWith({ method: "eth_accounts" });
    expect(walletState.walletNetworkError.value).toMatch(/EVM wallet account is no longer available/i);
  });

  it("blocks EVM signing when the active wallet account changes without a wallet event", async () => {
    window.ethereum = {
      request: vi.fn(async ({ method }) => (method === "eth_accounts" ? ["0xdef"] : null)),
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      evmAddress: "0xabc",
    });

    await expect(walletService.signMessage("hello")).rejects.toThrow(
      /EVM wallet account changed/i,
    );
    expect(walletState.walletNetworkError.value).toMatch(/EVM wallet account changed/i);
  });

  it("blocks EVM signing when the signer address drifts after the account precheck", async () => {
    const evmSignMessageMock = vi.fn(async () => "0xsigned");
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: class MockBrowserProvider {
          async getSigner() {
            return {
              getAddress: vi.fn(async () => "0xdef"),
              signMessage: evmSignMessageMock,
            };
          }
        },
      },
    }));
    window.ethereum = {
      request: vi.fn(async ({ method }) => (method === "eth_accounts" ? ["0xabc"] : null)),
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      evmAddress: "0xabc",
    });

    await expect(walletService.signMessage("hello")).rejects.toThrow(
      /EVM wallet account changed/i,
    );
    expect(evmSignMessageMock).not.toHaveBeenCalled();
    expect(walletState.walletNetworkError.value).toMatch(/EVM wallet account changed/i);
  });

  it("blocks EVM AA invokes when the active account changes after typed-data signing", async () => {
    vi.stubEnv("VITE_AA_HASH_MAINNET", `0x${"ab".repeat(20)}`);
    const evmSignTypedDataMock = vi.fn(async () => "0xsigned");
    vi.doMock("ethers", () => ({
      ethers: {
        BrowserProvider: class MockBrowserProvider {
          async getSigner() {
            return {
              getAddress: vi.fn(async () => "0xabc"),
              signTypedData: evmSignTypedDataMock,
            };
          }
        },
      },
    }));

    let accountReadCount = 0;
    window.ethereum = {
      request: vi.fn(async ({ method }) => {
        if (method !== "eth_accounts") return null;
        accountReadCount += 1;
        return accountReadCount >= 2 ? ["0xdef"] : ["0xabc"];
      }),
    };

    const relayerFetchMock = vi.fn(async (_url, options) => {
      const body = JSON.parse(options?.body || "{}");
      if (body.action !== "prepare") {
        throw new Error("execute should not be called after an EVM account drift");
      }
      return {
        ok: true,
        json: async () => ({
          domain: {
            chainId: 860833102,
            verifyingContract: `0x${"ab".repeat(20)}`,
          },
          types: {
            MetaTx: [{ name: "argsHash", type: "bytes32" }],
          },
          message: {
            argsHash: `0x${"11".repeat(32)}`,
            deadline: Math.floor(Date.now() / 1000) + 60,
            nonce: "1",
          },
          signerAddress: "0xabc",
        }),
      };
    });
    vi.stubGlobal("fetch", relayerFetchMock);

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      pubKey: `04${"11".repeat(64)}`,
      evmAddress: "0xabc",
    });

    await expect(walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "transfer",
      args: [],
    })).rejects.toThrow(/EVM wallet account changed/i);
    expect(evmSignTypedDataMock).toHaveBeenCalledTimes(1);
    expect(relayerFetchMock).toHaveBeenCalledTimes(1);
    expect(walletState.walletNetworkError.value).toMatch(/EVM wallet account changed/i);
  });

  it("normalizes EVM account-read failures into a reconnectable wallet error", async () => {
    window.ethereum = {
      request: vi.fn(async ({ method }) => {
        if (method === "eth_accounts") throw new Error("provider unavailable");
        return null;
      }),
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.hydrateSession(walletService.PROVIDERS.EVM_WALLET, {
      address: "Nabc",
      label: "EVM Wallet",
      pubKey: `04${"11".repeat(64)}`,
      evmAddress: "0xabc",
    });

    await expect(walletService.signMessage("hello")).rejects.toThrow(
      /EVM wallet account is no longer available/i,
    );
  });

  it("reports WalletConnect-style providers as unsupported for NeoChat auth until public key exposure is available", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.hydrateSession(walletService.PROVIDERS.NEON, {
      address: "NfK1tWc7bF9Rk2wQw9mKgU4Pj3Qe8Yz7kM",
      label: "Neon Wallet",
    });

    expect(walletService.getChatAuthSupport()).toEqual({
      supported: false,
      reason:
        "This wallet connection does not reliably expose the Neo public key needed for NeoChat login yet. Use NeoLine, OneGate, Web3Auth, or Testnet WIF.",
    });
  });

  it("does not expose the removed O3 provider even if a legacy neo3Dapi object is injected", async () => {
    window.neo3Dapi = {
      getAccount: vi.fn(),
      getNetworks: vi.fn(),
      invoke: vi.fn(),
    };

    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getSupportedProviders()).not.toContain("O3");
    expect(walletService.getAvailableProviders()).not.toContain("O3");
    await expect(walletService.connect("O3")).rejects.toThrow(/unknown provider/i);
  });

  it("detects NeoLine when only the NEOLine N3 API is injected", async () => {
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getAvailableProviders()).toContain(walletService.PROVIDERS.NEOLINE);
  });

  it("lists OneGate when a compatible dAPI object is injected", async () => {
    window.OneGate = {
      getAccount: oneGateGetAccountMock,
      getNetworks: oneGateGetNetworksMock,
      invoke: oneGateInvokeMock,
    };

    const { walletService } = await import("../../src/services/walletService.js");
    expect(walletService.getAvailableProviders()).toContain(walletService.PROVIDERS.ONEGATE);
  });

  it("connects to OneGate via a compatible dAPI provider", async () => {
    window.OneGate = {
      getAccount: oneGateGetAccountMock,
      getNetworks: oneGateGetNetworksMock,
      invoke: oneGateInvokeMock,
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    const account = await walletService.connect(walletService.PROVIDERS.ONEGATE);

    expect(account).toEqual({
      address: "Nbb4ZVd4VZ8fcwZQ7k3NQ5Nus4C7Ew6S4Y",
      label: "OneGate",
    });
  });

  it("clears stale wallet network errors before connecting Web3Auth", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");

    await seedOneGateNetworkError(walletService, walletState);
    await walletService.connect(walletService.PROVIDERS.WEB3AUTH);

    expect(walletService.provider).toBe(walletService.PROVIDERS.WEB3AUTH);
    expect(walletState.connectedAccount.value).toBe(web3AuthAccount.address);
    expect(walletState.walletNetworkError.value).toBe("");
  });

  it("clears stale wallet network errors before committing WalletConnect approval", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");

    await seedOneGateNetworkError(walletService, walletState);
    const result = await walletService.connect(walletService.PROVIDERS.WALLETCONNECT);
    await result.approval;

    expect(walletService.provider).toBe(walletService.PROVIDERS.WALLETCONNECT);
    expect(walletState.connectedAccount.value).toBe(walletConnectAccount.address);
    expect(walletState.walletNetworkError.value).toBe("");
  });

  it("clears stale wallet network errors before connecting the direct testnet WIF wallet", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");

    await seedOneGateNetworkError(walletService, walletState);
    envState.value = "TestT5";
    await walletService.connect(walletService.PROVIDERS.TESTNET_WIF, { wif: DIRECT_WIF });

    expect(walletService.provider).toBe(walletService.PROVIDERS.TESTNET_WIF);
    expect(walletState.connectedAccount.value).toBe("NTestWifAccount111111111111111111111");
    expect(walletState.walletNetworkError.value).toBe("");
  });

  it("shares connected wallet state globally and clears it on disconnect", async () => {
    window.OneGate = {
      getAccount: oneGateGetAccountMock,
      getNetworks: oneGateGetNetworksMock,
      invoke: oneGateInvokeMock,
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();

    await walletService.connect(walletService.PROVIDERS.ONEGATE);

    expect(walletState.connectedAccount.value).toBe("Nbb4ZVd4VZ8fcwZQ7k3NQ5Nus4C7Ew6S4Y");
    expect(walletState.connectedWalletProvider.value).toBe(walletService.PROVIDERS.ONEGATE);
    expect(localStorage.getItem("connectedWallet")).toBe("Nbb4ZVd4VZ8fcwZQ7k3NQ5Nus4C7Ew6S4Y");
    expect(localStorage.getItem("walletProvider")).toBe(walletService.PROVIDERS.ONEGATE);

    walletService.disconnect();

    expect(walletState.connectedAccount.value).toBe("");
    expect(walletState.connectedWalletProvider.value).toBe("");
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("blocks NeoLine invokes when the active wallet account changes outside the Explorer", async () => {
    const changedNeoLineAccount = {
      address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
      label: "NeoLine",
    };
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    neoLineInvokeMock.mockClear();
    neoLineGetAccountMock.mockResolvedValue(changedNeoLineAccount);

    await expect(walletService.invoke({
      scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
      operation: "register",
      args: [{ type: "String", value: "accountguard.matrix" }],
    })).rejects.toThrow(/NeoLine account changed/i);

    expect(neoLineInvokeMock).not.toHaveBeenCalled();
    expect(walletState.walletNetworkError.value).toMatch(/NeoLine account changed/i);
  });

  it("keeps NeoLine service state in sync when the wallet emits an account change event", async () => {
    const initialNeoLineAccount = {
      address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
      label: "NeoLine",
    };
    const changedNeoLineAccount = {
      address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
      label: "NeoLine",
    };
    neoLineGetAccountMock.mockResolvedValue(initialNeoLineAccount);
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);
    expect(walletService.account).toEqual(initialNeoLineAccount);

    window.dispatchEvent(new CustomEvent("NEOLine.N3.EVENT.ACCOUNT_CHANGED", {
      detail: changedNeoLineAccount,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(walletService.account).toEqual(changedNeoLineAccount);
    expect(walletState.connectedAccount.value).toBe(changedNeoLineAccount.address);
    expect(localStorage.getItem("connectedWallet")).toBe(changedNeoLineAccount.address);
    expect(localStorage.getItem("walletProvider")).toBe(walletService.PROVIDERS.NEOLINE);
  });

  it("keeps a hydrated NeoLine session in sync when the wallet emits an account change event", async () => {
    const hydratedNeoLineAccount = {
      address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
      label: "NeoLine",
    };
    const changedNeoLineAccount = {
      address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
      label: "NeoLine",
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();
    walletService.hydrateSession(walletService.PROVIDERS.NEOLINE, hydratedNeoLineAccount);
    expect(walletService.account).toEqual(hydratedNeoLineAccount);

    window.dispatchEvent(new CustomEvent("NEOLine.N3.EVENT.ACCOUNT_CHANGED", {
      detail: changedNeoLineAccount,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(walletService.account).toEqual(changedNeoLineAccount);
    expect(walletState.connectedAccount.value).toBe(changedNeoLineAccount.address);
    expect(localStorage.getItem("connectedWallet")).toBe(changedNeoLineAccount.address);
    expect(localStorage.getItem("walletProvider")).toBe(walletService.PROVIDERS.NEOLINE);
  });

  it("blocks OneGate signing when the active wallet account changes outside the Explorer", async () => {
    const oneGateSignMessageMock = vi.fn(async () => ({ publicKey: "03dead", data: "sig" }));
    window.OneGate = {
      getAccount: oneGateGetAccountMock,
      getNetworks: oneGateGetNetworksMock,
      invoke: oneGateInvokeMock,
      signMessage: oneGateSignMessageMock,
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.ONEGATE);

    oneGateGetAccountMock.mockResolvedValue({
      address: "NChangedOneGateAccount11111111111111111",
      label: "OneGate",
    });

    await expect(walletService.signMessage("hello")).rejects.toThrow(/OneGate account changed/i);
    expect(oneGateSignMessageMock).not.toHaveBeenCalled();
    expect(walletState.walletNetworkError.value).toMatch(/OneGate account changed/i);
  });

  it("skips NeoLine account reads during passive restore validation", async () => {
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    walletService.hydrateSession(walletService.PROVIDERS.NEOLINE, {
      address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
      label: walletService.PROVIDERS.NEOLINE,
    });

    neoLineGetAccountMock.mockClear();
    await expect(walletService.ensureNetworkConsistency({ allowSwitch: false, verifyAccount: false })).resolves.toBe(true);

    expect(neoLineGetNetworksMock).toHaveBeenCalled();
    expect(neoLineSwitchNetworkMock).not.toHaveBeenCalled();
    expect(neoLineGetAccountMock).not.toHaveBeenCalled();
  });

  it("skips OneGate account reads during passive restore validation", async () => {
    window.OneGate = {
      getAccount: oneGateGetAccountMock,
      getNetworks: oneGateGetNetworksMock,
      switchNetwork: vi.fn(),
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    walletService.hydrateSession(walletService.PROVIDERS.ONEGATE, {
      address: "Nbb4ZVd4VZ8fcwZQ7k3NQ5Nus4C7Ew6S4Y",
      label: walletService.PROVIDERS.ONEGATE,
    });

    oneGateGetAccountMock.mockClear();
    await expect(walletService.ensureNetworkConsistency({ allowSwitch: false, verifyAccount: false })).resolves.toBe(true);

    expect(oneGateGetNetworksMock).toHaveBeenCalled();
    expect(window.OneGate.switchNetwork).not.toHaveBeenCalled();
    expect(oneGateGetAccountMock).not.toHaveBeenCalled();
  });

  it("rechecks and switches NeoLine back to the Explorer network before invoking", async () => {
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    neoLineSwitchNetworkMock.mockClear();
    neoLineGetNetworksMock.mockResolvedValue({ defaultNetwork: "N3TestNet" });

    await walletService.invoke({
      scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
      operation: "register",
      args: [{ type: "String", value: "networkguard.matrix" }],
    });

    expect(neoLineSwitchNetworkMock).toHaveBeenCalledWith({ network: "N3MainNet" });
    expect(neoLineInvokeMock).toHaveBeenCalled();
  });

  it("rejects NeoLine connections when the wallet does not report an active network", async () => {
    window.NEOLine = {};
    neoLineGetNetworksMock.mockResolvedValue({ defaultNetwork: "" });
    neoLineSwitchNetworkMock.mockResolvedValue({ defaultNetwork: "" });
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    await expect(walletService.connect(walletService.PROVIDERS.NEOLINE)).rejects.toThrow(
      /NeoLine did not report its active network/i,
    );
    expect(walletService.isConnected).toBe(false);
  });

  it("routes Neon Wallet connections through WalletConnect", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    const result = await walletService.connect(walletService.PROVIDERS.NEON);
    const account = await result.approval;

    expect(walletConnectInitMock).toHaveBeenCalledTimes(1);
    expect(walletConnectConnectMock).toHaveBeenCalledTimes(1);
    expect(account).toEqual({
      address: walletConnectAccount.address,
      label: walletService.PROVIDERS.NEON,
    });
  });

  it("does not commit WalletConnect state after a pending connection is canceled", async () => {
    let resolveApproval;
    walletConnectConnectMock.mockResolvedValueOnce({
      uri: "wc:stale-service-approval",
      approval: new Promise((resolve) => {
        resolveApproval = resolve;
      }),
    });

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();

    const result = await walletService.connect(walletService.PROVIDERS.WALLETCONNECT);
    expect(result.uri).toBe("wc:stale-service-approval");

    walletService.cancelPendingConnection();
    resolveApproval();

    await expect(result.approval).rejects.toThrow(/canceled or superseded/i);
    expect(walletConnectDisconnectMock).toHaveBeenCalled();
    expect(walletService.isConnected).toBe(false);
    expect(walletService.account).toBeNull();
    expect(walletState.connectedAccount.value).toBe("");
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("does not let a stale WalletConnect restore commit after a newer wallet action", async () => {
    let resolveRestore;
    walletConnectRestoreSessionMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRestore = resolve;
    }));

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    walletConnectDisconnectMock.mockClear();

    const restorePromise = walletService.restoreSession(walletService.PROVIDERS.WALLETCONNECT);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(walletConnectRestoreSessionMock).toHaveBeenCalledTimes(1);

    walletService.cancelPendingConnection();
    resolveRestore(walletConnectAccount);

    await expect(restorePromise).rejects.toMatchObject({ code: "WALLET_CONNECTION_SUPERSEDED" });
    expect(walletConnectDisconnectMock).toHaveBeenCalledTimes(1);
    expect(walletService.isConnected).toBe(false);
    expect(walletService.account).toBeNull();
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("clears WalletConnect-style global wallet state when the wallet deletes the session remotely", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();

    const result = await walletService.connect(walletService.PROVIDERS.NEON);
    await result.approval;

    expect(walletService.isConnected).toBe(true);
    expect(walletState.connectedAccount.value).toBe(walletConnectAccount.address);
    expect(localStorage.getItem("connectedWallet")).toBe(walletConnectAccount.address);
    expect(walletConnectSessionChangeHandler).toEqual(expect.any(Function));

    walletConnectSessionChangeHandler({ connected: false, account: null, reason: "session_delete" });

    expect(walletService.isConnected).toBe(false);
    expect(walletService.account).toBeNull();
    expect(walletState.connectedAccount.value).toBe("");
    expect(walletState.connectedWalletProvider.value).toBe("");
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("keeps the WalletConnect-style network error and provider visible when a remote session becomes incompatible", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();

    const result = await walletService.connect(walletService.PROVIDERS.NEON);
    await result.approval;

    walletConnectSessionChangeHandler({
      connected: false,
      account: null,
      reason: "session_update",
      error: new Error("WalletConnect session is on neo3:testnet; reconnect on neo3:mainnet."),
    });

    expect(walletService.isConnected).toBe(false);
    expect(walletService.provider).toBeNull();
    expect(walletService.account).toBeNull();
    expect(walletState.connectedAccount.value).toBe("");
    expect(walletState.connectedWalletProvider.value).toBe(walletService.PROVIDERS.NEON);
    expect(walletState.walletNetworkError.value).toMatch(/WalletConnect session is on neo3:testnet/i);
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("updates WalletConnect-style global wallet state when the wallet reports an account change", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();

    const result = await walletService.connect(walletService.PROVIDERS.WALLETCONNECT);
    await result.approval;

    walletConnectSessionChangeHandler({
      connected: true,
      account: { address: "NChangedWalletConnectAccount", label: "WalletConnect" },
      reason: "accountChanged",
    });

    expect(walletService.isConnected).toBe(true);
    expect(walletService.account).toEqual({
      address: "NChangedWalletConnectAccount",
      label: walletService.PROVIDERS.WALLETCONNECT,
    });
    expect(walletState.connectedAccount.value).toBe("NChangedWalletConnectAccount");
    expect(localStorage.getItem("connectedWallet")).toBe("NChangedWalletConnectAccount");
    expect(localStorage.getItem("walletProvider")).toBe(walletService.PROVIDERS.WALLETCONNECT);
  });

  it("passes the active WalletConnect-style account as an explicit signer", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    const result = await walletService.connect(walletService.PROVIDERS.WALLETCONNECT);
    await result.approval;

    walletConnectInvokeMock.mockClear();
    await walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "transfer",
      args: [{ type: "Hash160", value: walletConnectAccount.address }],
      scope: 128,
    });

    expect(walletConnectInvokeMock).toHaveBeenCalledWith({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "transfer",
      args: [{ type: "Hash160", value: walletConnectScriptHash }],
      signerScope: 128,
      signers: [{ account: walletConnectScriptHash, scopes: 128 }],
    });
  });

  it("connects to the direct testnet WIF provider without persisting session state", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    const account = await walletService.connect(walletService.PROVIDERS.TESTNET_WIF, { wif: DIRECT_WIF });

    expect(account).toEqual({
      address: "NTestWifAccount111111111111111111111",
      label: walletService.PROVIDERS.TESTNET_WIF,
      persistSession: "session",
    });
  });

  it("builds a raw transaction signing payload without requiring a wallet connection", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    const payload = await walletService.getRawTransactionSigningPayload("001122");

    expect(compatTxDeserializeMock).toHaveBeenCalledWith("001122");
    expect(getVersionMock).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      payload: "334f454eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
  });

  it("signs raw transactions with the direct testnet WIF provider", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.TESTNET_WIF, { wif: DIRECT_WIF });

    const signature = await walletService.signRawTransaction("001122");

    expect(compatTxDeserializeMock).toHaveBeenCalledWith("001122");
    expect(directWifHexSignMock).toHaveBeenCalledTimes(1);
    expect(signature).toBe("f".repeat(128));
  });

  it("invokes contracts with the direct testnet WIF provider using a signed fee-calculation transaction", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.TESTNET_WIF, { wif: DIRECT_WIF });

    await walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "vote",
      args: [
        { type: "Hash160", value: "a62eb3c767ef3d39d98c704f70fc4e869349a6fd" },
        { type: "PublicKey", value: "03c95f8e6fe4f6e9de4dbf67bf3ff47a1465644d0f32956543e12b3d6b0ffb02d7" },
      ],
      signers: [{ account: "a62eb3c767ef3d39d98c704f70fc4e869349a6fd", scopes: 1 }],
    });

    expect(calculateNetworkFeeMock).toHaveBeenCalledTimes(1);
    expect(signTxMock).toHaveBeenCalled();
    expect(sendRawTransactionMock).toHaveBeenCalledTimes(1);
  });

  it("restores a persisted Neon Wallet session without starting a new pairing flow", async () => {
    walletConnectRestoreSessionMock.mockResolvedValueOnce(walletConnectAccount);

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    const account = await walletService.restoreSession(walletService.PROVIDERS.NEON);

    expect(walletConnectInitMock).toHaveBeenCalledTimes(1);
    expect(walletConnectRestoreSessionMock).toHaveBeenCalledTimes(1);
    expect(walletConnectConnectMock).not.toHaveBeenCalled();
    expect(account).toEqual({
      address: walletConnectAccount.address,
      label: walletService.PROVIDERS.NEON,
    });
  });

  it("does not let a stale Web3Auth restore overwrite a newer manual connection", async () => {
    const restoredAccount = {
      address: "NRestoreWeb3Auth111111111111111111111",
      label: "Web3Auth Account",
    };
    const manualAccount = {
      address: "NManualWeb3Auth111111111111111111111",
      label: "Web3Auth Account",
    };
    let resolveRestore;
    getAccountMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRestore = resolve;
    }));
    connectMock.mockResolvedValueOnce(manualAccount);

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    const restorePromise = walletService.restoreSession(walletService.PROVIDERS.WEB3AUTH);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getAccountMock).toHaveBeenCalledTimes(1);

    const connected = await walletService.connect(walletService.PROVIDERS.WEB3AUTH);
    resolveRestore(restoredAccount);

    await expect(restorePromise).rejects.toMatchObject({ code: "WALLET_CONNECTION_SUPERSEDED" });
    expect(connected.address).toBe(manualAccount.address);
    expect(walletService.provider).toBe(walletService.PROVIDERS.WEB3AUTH);
    expect(walletService.account).toEqual(manualAccount);
    expect(localStorage.getItem("connectedWallet")).toBe(manualAccount.address);
  });

  it("restores a direct testnet WIF session when the WIF is provided again", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    const account = await walletService.restoreSession(walletService.PROVIDERS.TESTNET_WIF, { wif: DIRECT_WIF });

    expect(account).toEqual({
      address: "NTestWifAccount111111111111111111111",
      label: walletService.PROVIDERS.TESTNET_WIF,
      persistSession: "session",
    });
  });

  it("passes script-hash signer and numeric witness scope to NeoLine dAPI", async () => {
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);
    await walletService.invoke({
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd",
      operation: "deploy",
      args: [],
      scope: 128,
    });

    expect(neoLineInvokeMock).toHaveBeenCalledTimes(1);
    const [params] = neoLineInvokeMock.mock.calls[0];
    expect(params).not.toHaveProperty("network");
    expect(params.signers[0].scopes).toBe(128);
  });

  it("normalizes numeric ContractParam types and HexString-like values for NeoLine invoke", async () => {
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);
    await walletService.invoke({
      scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
      operation: "register",
      args: [
        { type: 19, value: "quasarproof.matrix" },
        { type: 20, value: { toString: () => "13ef519c362973f9a34648a9eac5b71250b2a80a" } },
      ],
      signers: [{ account: "13ef519c362973f9a34648a9eac5b71250b2a80a", scopes: "CalledByEntry" }],
    });

    const [params] = neoLineInvokeMock.mock.calls.at(-1);
    expect(params.args).toEqual([
      { type: "String", value: "quasarproof.matrix" },
      { type: "Hash160", value: "13ef519c362973f9a34648a9eac5b71250b2a80a" },
    ]);
  });

  it("coerces Boolean string and Array JSON args from the contract write tab UI", async () => {
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);
    await walletService.invoke({
      scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
      operation: "configure",
      args: [
        // ParamInput stores the toggle as the literal string "true"
        { type: "Boolean", value: "true" },
        // Array textarea hands us a JSON string
        { type: "Array", value: '[1,"ok"]' },
      ],
    });

    const [params] = neoLineInvokeMock.mock.calls.at(-1);
    expect(params.args).toEqual([
      { type: "Boolean", value: true },
      {
        type: "Array",
        value: [
          { type: "Integer", value: "1" },
          { type: "String", value: "ok" },
        ],
      },
    ]);
  });

  it("does not retry NeoLine invoke with a legacy network alias while authorization is pending", async () => {
    vi.useFakeTimers();
    try {
      window.NEOLine = {};
      neoLineInvokeMock.mockReset();
      neoLineInvokeMock.mockRejectedValueOnce({
        type: "CONNECTION_DENIED",
        description: "The dAPI provider refused to process this request",
      });
      window.NEOLineN3 = {
        Init: function Init() {
          return {
            getNetworks: neoLineGetNetworksMock,
            getAccount: neoLineGetAccountMock,
            invoke: neoLineInvokeMock,
          };
        },
      };

      const { walletService } = await import("../../src/services/walletService.js");
      walletService.disconnect();
      await walletService.connect(walletService.PROVIDERS.NEOLINE);

      const invokePromise = walletService.invoke({
        scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
        operation: "register",
        args: [{ type: "String", value: "loopproof.matrix" }],
      });
      const invokeErrorPromise = invokePromise.catch((error) => error);

      await vi.advanceTimersByTimeAsync(20);
      expect(neoLineInvokeMock).toHaveBeenCalledTimes(1);
      const [params] = neoLineInvokeMock.mock.calls[0];
      expect(params).not.toHaveProperty("network");

      await vi.advanceTimersByTimeAsync(60000);
      const invokeError = await invokeErrorPromise;
      expect(invokeError).toBeInstanceOf(Error);
      expect(invokeError.message).toMatch(/NeoLine refused this request/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries NeoLine invoke once after the authorization popup emits a connected event", async () => {
    vi.useFakeTimers();
    try {
      window.NEOLine = {};
      neoLineInvokeMock.mockReset();
      neoLineInvokeMock
        .mockRejectedValueOnce({
          type: "CONNECTION_DENIED",
          description: "The dAPI provider refused to process this request",
        })
        .mockResolvedValueOnce({ txid: "0xafterauth" });
      window.NEOLineN3 = {
        Init: function Init() {
          return {
            getNetworks: neoLineGetNetworksMock,
            getAccount: neoLineGetAccountMock,
            invoke: neoLineInvokeMock,
          };
        },
      };

      const { walletService } = await import("../../src/services/walletService.js");
      walletService.disconnect();
      await walletService.connect(walletService.PROVIDERS.NEOLINE);

      const invokePromise = walletService.invoke({
        scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
        operation: "register",
        args: [{ type: "String", value: "eventretry.matrix" }],
      });

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("NEOLine.NEO.EVENT.CONNECTED", {
            detail: {
              address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
              label: "testnet",
            },
          }),
        );
      }, 20);

      await vi.advanceTimersByTimeAsync(20);
      await expect(invokePromise).resolves.toEqual({ txid: "0xafterauth" });
      expect(neoLineInvokeMock).toHaveBeenCalledTimes(2);
      expect(neoLineInvokeMock.mock.calls[0]?.[0]).toEqual(neoLineInvokeMock.mock.calls[1]?.[0]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows slower NeoLine authorization flows before timing out the invoke request", async () => {
    vi.useFakeTimers();
    try {
      window.NEOLine = {};
      neoLineInvokeMock.mockReset();
      neoLineInvokeMock
        .mockRejectedValueOnce({
          type: "CONNECTION_DENIED",
          description: "The dAPI provider refused to process this request",
        })
        .mockResolvedValueOnce({ txid: "0xslowauth" });
      window.NEOLineN3 = {
        Init: function Init() {
          return {
            getNetworks: neoLineGetNetworksMock,
            getAccount: neoLineGetAccountMock,
            invoke: neoLineInvokeMock,
          };
        },
      };

      const { walletService } = await import("../../src/services/walletService.js");
      walletService.disconnect();
      await walletService.connect(walletService.PROVIDERS.NEOLINE);

      const invokePromise = walletService.invoke({
        scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
        operation: "register",
        args: [{ type: "String", value: "slowauth.matrix" }],
      });

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("NEOLine.NEO.EVENT.CONNECTED", {
            detail: {
              address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
              label: "testnet",
            },
          }),
        );
      }, 20000);

      await vi.advanceTimersByTimeAsync(20000);
      await expect(invokePromise).resolves.toEqual({ txid: "0xslowauth" });
      expect(neoLineInvokeMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the explorer testnet network when NeoLine signs raw transactions", async () => {
    envState.value = "TestT5";
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    const signature = await walletService.signRawTransaction("001122");

    expect(signature).toBe("neoline-signature");
    expect(neoLineSwitchNetworkMock).toHaveBeenCalledWith({ network: "N3TestNet" });
    expect(neoLineSignTransactionMock).toHaveBeenCalledWith({
      transaction: "001122",
      network: "N3TestNet",
    });
  });

  it("surfaces NeoLine malformed-input signing errors as readable Error messages", async () => {
    envState.value = "TestT5";
    neoLineSignTransactionMock.mockRejectedValueOnce({
      type: "MALFORMED_INPUT",
      description: "Current account is not a signer in this transaction",
      data: null,
    });
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    await expect(walletService.signRawTransaction("001122")).rejects.toThrow(
      "Current account is not a signer in this transaction"
    );
  });

  it("extracts a bare signature from NeoLine signTransaction witness results", async () => {
    envState.value = "TestT5";
    neoLineSignTransactionMock.mockResolvedValueOnce({
      witnesses: [
        {
          invocationScript: `0c40${"ab".repeat(64)}`,
          verificationScript: "2103deadbeef",
        },
      ],
    });
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    const signature = await walletService.signRawTransaction("001122");

    expect(signature).toBe("ab".repeat(64));
  });

  it("returns signer metadata from NeoLine signTransaction witness results", async () => {
    envState.value = "TestT5";
    neoLineSignTransactionMock.mockResolvedValueOnce({
      witnesses: [
        {
          invocationScript: `0c40${"ab".repeat(64)}`,
          verificationScript: "0c2103f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c54156e7b327",
        },
      ],
    });
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    const result = await walletService.signRawTransactionDetailed("001122");

    expect(result).toMatchObject({
      signature: "ab".repeat(64),
      publicKey: "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
      invocationScript: `0c40${"ab".repeat(64)}`,
    });
    expect(typeof result.signerAddress).toBe("string");
    expect(result.signerAddress.length).toBeGreaterThan(0);
  });

  it("switches the active NeoLine account through the dAPI", async () => {
    neoLineGetAccountMock.mockImplementation(async () => {
      if (neoLineSwitchWalletAccountMock.mock.calls.length) {
        return {
          address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
          label: "NeoLine",
        };
      }
      return {
        address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
        label: "NeoLine",
      };
    });
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
          switchWalletAccount: neoLineSwitchWalletAccountMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    const nextAccount = await walletService.switchWalletAccount();

    expect(neoLineSwitchWalletAccountMock).toHaveBeenCalledTimes(1);
    expect(nextAccount).toEqual({
      address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
      label: walletService.PROVIDERS.NEOLINE,
    });
    expect(walletService.account).toEqual(nextAccount);
  });

  it("rechecks and switches the NeoLine network after switching accounts", async () => {
    neoLineGetAccountMock.mockImplementation(async () => {
      if (neoLineSwitchWalletAccountMock.mock.calls.length) {
        return {
          address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
          label: "NeoLine",
        };
      }
      return {
        address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
        label: "NeoLine",
      };
    });
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
          switchWalletAccount: neoLineSwitchWalletAccountMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    neoLineSwitchNetworkMock.mockClear();
    neoLineGetNetworksMock.mockResolvedValue({ defaultNetwork: "N3TestNet" });

    await walletService.switchWalletAccount();

    expect(neoLineSwitchWalletAccountMock).toHaveBeenCalledTimes(1);
    expect(neoLineSwitchNetworkMock).toHaveBeenCalledWith({ network: "N3MainNet" });
  });

  it("rejects NeoLine account switching when the wallet no longer reports a network", async () => {
    neoLineGetAccountMock.mockImplementation(async () => {
      if (neoLineSwitchWalletAccountMock.mock.calls.length) {
        return {
          address: "Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv",
          label: "NeoLine",
        };
      }
      return {
        address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
        label: "NeoLine",
      };
    });
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
          switchWalletAccount: neoLineSwitchWalletAccountMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    const walletState = await import("../../src/utils/walletState.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    neoLineGetNetworksMock.mockResolvedValue({ defaultNetwork: "" });
    neoLineSwitchNetworkMock.mockResolvedValue({ defaultNetwork: "" });

    await expect(walletService.switchWalletAccount()).rejects.toThrow(
      /NeoLine did not report its active network/i,
    );
    expect(walletState.connectedAccount.value).toBe("Nb3y1uCzYxk4q8m3P4Lqf6q2mNn7k8R5Qv");
    expect(walletState.walletNetworkError.value).toMatch(/NeoLine did not report its active network/i);
  });

  it("waits for a NeoLine connected event instead of immediately retrying account authorization", async () => {
    window.NEOLine = {};
    neoLineGetAccountMock.mockRejectedValueOnce({
      type: "CONNECTION_DENIED",
      description: "The dAPI provider refused to process this request",
    });
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    const connectPromise = walletService.connect(walletService.PROVIDERS.NEOLINE);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(neoLineGetAccountMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new CustomEvent("NEOLine.NEO.EVENT.CONNECTED", {
        detail: {
          address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
          label: "NeoLine",
        },
      }),
    );

    const account = await connectPromise;
    expect(account.address).toBe("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");
    expect(account.label).toBe("NeoLine");
    expect(neoLineGetAccountMock).toHaveBeenCalledTimes(1);
  });

  it("returns the connected NeoLine public key when dAPI exposes it", async () => {
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          getPublicKey: neoLineGetPublicKeyMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);

    await expect(walletService.getPublicKey()).resolves.toBe(
      "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5"
    );
  });

  it("accepts NeoLine connected events when getAccount hangs after approval", async () => {
    window.NEOLine = {};
    neoLineGetAccountMock.mockImplementationOnce(() => new Promise(() => {}));
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getNetworks: neoLineGetNetworksMock,
          getAccount: neoLineGetAccountMock,
          invoke: neoLineInvokeMock,
          signTransaction: neoLineSignTransactionMock,
          switchNetwork: neoLineSwitchNetworkMock,
        };
      },
    };

    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();

    const connectPromise = walletService.connect(walletService.PROVIDERS.NEOLINE);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("NEOLine.NEO.EVENT.CONNECTED", {
          detail: {
            address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
            label: "NeoLine",
          },
        }),
      );
    }, 20);

    const account = await connectPromise;

    expect(account).toEqual({
      address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
      label: "NeoLine",
    });
    expect(neoLineGetAccountMock).toHaveBeenCalledTimes(1);
  });

  it("uses RPC getversion network magic for Web3Auth signing", async () => {
    envState.value = "PrivateNet";
    getVersionMock.mockResolvedValue({ protocol: { network: 123456789 } });

    const { walletService } = await import("../../src/services/walletService.js");

    await walletService.connect(walletService.PROVIDERS.WEB3AUTH);
    await walletService.invoke({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "vote",
      args: [
        { type: "Hash160", value: "a62eb3c767ef3d39d98c704f70fc4e869349a6fd" },
        { type: "PublicKey", value: "03c95f8e6fe4f6e9de4dbf67bf3ff47a1465644d0f32956543e12b3d6b0ffb02d7" },
      ],
      signers: [{ account: "a62eb3c767ef3d39d98c704f70fc4e869349a6fd", scopes: 1 }],
    });

    expect(getVersionMock).toHaveBeenCalledTimes(1);
    expect(signTxMock).toHaveBeenCalled();
    const usedMagic = signTxMock.mock.calls.at(-1)?.[1];
    expect(usedMagic).toBe(123456789);
  });
});
