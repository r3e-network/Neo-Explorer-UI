import { beforeEach, describe, expect, it, vi } from "vitest";

const web3AuthAccount = {
  address: "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf",
  publicKey: "03e66f7f5f327f7eb5c11bfb2bde0864e80f98f2f0f9f4f23ae86f0fd82d4f0f60",
  sign: vi.fn(() => "signed-message"),
};

const connectMock = vi.fn(async () => web3AuthAccount);
const getAccountMock = vi.fn(async () => web3AuthAccount);

const invokeScriptMock = vi.fn(async (script) => {
  if (typeof script === "string") {
    throw new Error("Invalid params");
  }

  return { state: "HALT", gasconsumed: "100000" };
});
const getBlockCountMock = vi.fn(async () => 123456);
const calculateNetworkFeeMock = vi.fn(async () => "1000");
const sendRawTransactionMock = vi.fn(async () => "0xtesttxid");
const neoLineInvokeMock = vi.fn(async () => ({ txid: "0xneoline" }));
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
const walletConnectAccount = { address: "NfK1tWc7bF9Rk2wQw9mKgU4Pj3Qe8Yz7kM", label: "WalletConnect" };

class MockRpcClient {
  async getBlockCount() {
    return getBlockCountMock();
  }

  async invokeScript(script, signers) {
    return invokeScriptMock(script, signers);
  }

  async calculateNetworkFee(txn) {
    return calculateNetworkFeeMock(txn);
  }

  async sendRawTransaction(serialized) {
    return sendRawTransactionMock(serialized);
  }
}

class MockTransaction {
  constructor(data = {}) {
    this.data = data;
  }

  sign() {}

  serialize() {
    return "serialized-transaction";
  }
}

class MockScriptBuilder {
  emitAppCall() {}

  build() {
    return "51";
  }
}

class MockWalletAccount {
  constructor(input) {
    const value = String(input || "");
    if (value === "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu") {
      this.scriptHash = "13ef519c362973f9a34648a9eac5b71250b2a80a";
      return;
    }

    this.scriptHash = value.replace(/^0x/i, "").toLowerCase();
  }
}

vi.mock("@cityofzion/neon-js", () => ({
  rpc: { RPCClient: MockRpcClient },
  tx: { Transaction: MockTransaction },
  wallet: {
    Account: MockWalletAccount,
    getAddressFromScriptHash: (value) => `N${String(value).replace(/^0x/i, "").slice(0, 33)}`,
  },
  sc: {
    ScriptBuilder: MockScriptBuilder,
    ContractParam: {
      fromJson: (arg) => arg,
      byteArray: (value) => value,
    },
    createScript: () => "51",
  },
  u: {
    str2hexstring: (value) => value,
    HexString: {
      fromHex: (hex) => ({
        toBase64: () => Buffer.from(hex, "hex").toString("base64"),
      }),
    },
    reverseHex: (value) => String(value || "").replace(/^0x/i, ""),
    hash160: () => "0x1234567890abcdef1234567890abcdef12345678",
  },
}));

vi.mock("../../src/services/walletConnectService.js", () => ({
  walletConnectService: {
    init: walletConnectInitMock,
    connect: walletConnectConnectMock,
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
  getCurrentEnv: () => "Mainnet",
}));

describe("walletService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("VITE_WC_PROJECT_ID", "test-project-id");
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
    const [scriptArg] = invokeScriptMock.mock.calls[0];
    expect(typeof scriptArg).not.toBe("string");
    expect(scriptArg.toBase64()).toBe("UQ==");
    expect(sendRawTransactionMock).toHaveBeenCalledTimes(1);
  });

  it("broadcasts signed transaction via RPC client", async () => {
    const { walletService } = await import("../../src/services/walletService.js");

    await walletService.connect(walletService.PROVIDERS.WEB3AUTH);
    const txid = await walletService.broadcastSignedTx("serialized-transaction");

    expect(sendRawTransactionMock).toHaveBeenCalledWith("serialized-transaction");
    expect(txid).toBe("0xtesttxid");
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
      ])
    );
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

  it("passes script-hash signer and numeric witness scope to NeoLine dAPI", async () => {
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
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd",
      operation: "deploy",
      args: [],
      scope: 128,
    });

    expect(neoLineInvokeMock).toHaveBeenCalledTimes(1);
    const [params] = neoLineInvokeMock.mock.calls[0];
    expect(params.network).toBe("N3MainNet");
    expect(params.signers[0].scopes).toBe(128);
  });

  it("retries NeoLine account authorization once when first request is denied", async () => {
    window.NEOLine = {};
    neoLineGetAccountMock
      .mockRejectedValueOnce({ type: "CONNECTION_DENIED", description: "The dAPI provider refused to process this request" })
      .mockResolvedValueOnce({ address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu", label: "NeoLine" });
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
    const account = await walletService.connect(walletService.PROVIDERS.NEOLINE);

    expect(account.address).toBe("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");
    expect(neoLineGetAccountMock).toHaveBeenCalledTimes(2);
  });
});
