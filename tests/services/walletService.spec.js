import { beforeEach, describe, expect, it, vi } from "vitest";

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
const walletConnectAccount = { address: "NfK1tWc7bF9Rk2wQw9mKgU4Pj3Qe8Yz7kM", label: "WalletConnect" };
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

vi.mock("@cityofzion/neon-js", () => { const _nm = {
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
}));

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
  },
}));

vi.mock("../../src/services/web3authService.js", () => ({
  web3authService: {
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("VITE_WC_PROJECT_ID", "test-project-id");
    envState.value = "Mainnet";
    compatTxDeserializeMock.mockReset();
    executeMock.mockResolvedValue({ protocol: { network: 860833102 } });
    getVersionMock.mockResolvedValue({ protocol: { network: 860833102 } });
    neoLineSwitchWalletAccountMock.mockReset();
    delete window.NEOLine;
    delete window.NEOLineN3;
    delete window.neo3Dapi;
    delete window.OneGate;
    delete window.neo;
    delete window.ethereum;
    localStorage.clear();
  });

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

  it("reports WalletConnect-style providers as unsupported for NeoChat auth until public key exposure is available", async () => {
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.hydrateSession(walletService.PROVIDERS.NEON, {
      address: "NfK1tWc7bF9Rk2wQw9mKgU4Pj3Qe8Yz7kM",
      label: "Neon Wallet",
    });

    expect(walletService.getChatAuthSupport()).toEqual({
      supported: false,
      reason:
        "This wallet connection does not reliably expose the Neo public key needed for NeoChat login yet. Use NeoLine, O3, OneGate, Web3Auth, or Testnet WIF.",
    });
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
