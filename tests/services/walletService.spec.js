import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({ value: "Mainnet" }));
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
const executeMock = vi.fn(async () => ({ protocol: { network: 860833102 } }));
const signTxMock = vi.fn();
const neoLineInvokeMock = vi.fn(async () => ({ txid: "0xneoline" }));
const neoLineSignTransactionMock = vi.fn(async () => ({ signature: "neoline-signature" }));
const neoLineSwitchNetworkMock = vi.fn(async () => ({ defaultNetwork: "N3TestNet" }));
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

  async invokeScript(script, signers) {
    return invokeScriptMock(script, signers);
  }

  async calculateNetworkFee(txn) {
    return calculateNetworkFeeMock(txn);
  }

  async sendRawTransaction(serialized) {
    return sendRawTransactionMock(serialized);
  }

  async execute(query) {
    return executeMock(query);
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

class MockScriptBuilder {
  emitAppCall() {}

  build() {
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
}

vi.mock("@cityofzion/neon-js", () => ({
  rpc: { RPCClient: MockRpcClient, Query: class { constructor(config) { this.config = config; } } },
  tx: { Transaction: MockTransaction },
  wallet: {
    Account: MockWalletAccount,
    getAddressFromScriptHash: (value) => `N${String(value).replace(/^0x/i, "").slice(0, 33)}`,
    isWIF: (value) => value === DIRECT_WIF,
    sign: directWifHexSignMock,
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
    num2hexstring: () => "01020304",
    reverseHex: (value) => String(value || "").replace(/^0x/i, ""),
    hash160: () => "0x1234567890abcdef1234567890abcdef12345678",
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
  getCurrentEnv: () => envState.value,
  getConfiguredRpcBaseUrl: () => "",
  toAbsoluteUrl: (value) => value,
}));

describe("walletService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("VITE_WC_PROJECT_ID", "test-project-id");
    envState.value = "Mainnet";
    executeMock.mockResolvedValue({ protocol: { network: 860833102 } });
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

  it("returns the full supported provider list regardless of availability", async () => {
    vi.stubEnv("VITE_WC_PROJECT_ID", "");
    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getSupportedProviders()).toEqual([
      walletService.PROVIDERS.NEOLINE,
      walletService.PROVIDERS.O3,
      walletService.PROVIDERS.ONEGATE,
      walletService.PROVIDERS.WALLETCONNECT,
      walletService.PROVIDERS.NEON,
      walletService.PROVIDERS.WEB3AUTH,
      walletService.PROVIDERS.EVM_WALLET,
      walletService.PROVIDERS.TESTNET_WIF,
    ]);
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

  it("lists the direct testnet WIF provider only when the explorer is on testnet", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");

    expect(walletService.getSupportedProviders()).toContain(walletService.PROVIDERS.TESTNET_WIF);
    expect(walletService.getAvailableProviders()).toContain(walletService.PROVIDERS.TESTNET_WIF);
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

  it("signs raw transactions with the direct testnet WIF provider", async () => {
    envState.value = "TestT5";
    const { walletService } = await import("../../src/services/walletService.js");
    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.TESTNET_WIF, { wif: DIRECT_WIF });

    const signature = await walletService.signRawTransaction("001122");

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
    window.NEOLine = {};
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

    await expect(
      walletService.invoke({
        scriptHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
        operation: "register",
        args: [{ type: "String", value: "loopproof.matrix" }],
      })
    ).rejects.toMatchObject({
      type: "CONNECTION_DENIED",
    });

    expect(neoLineInvokeMock).toHaveBeenCalledTimes(1);
    const [params] = neoLineInvokeMock.mock.calls[0];
    expect(params).not.toHaveProperty("network");
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

  it("waits for a NeoLine connected event instead of immediately retrying account authorization", async () => {
    window.NEOLine = {};
    neoLineGetAccountMock
      .mockRejectedValueOnce({ type: "CONNECTION_DENIED", description: "The dAPI provider refused to process this request" });
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
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(neoLineGetAccountMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new CustomEvent("NEOLine.NEO.EVENT.CONNECTED", {
        detail: {
          address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
          label: "NeoLine",
        },
      })
    );

    const account = await connectPromise;
    expect(account.address).toBe("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");
    expect(account.label).toBe("NeoLine");
    expect(neoLineGetAccountMock).toHaveBeenCalledTimes(1);
  });

  it("accepts NeoLine connected events when getAccount hangs after approval", async () => {
    window.NEOLine = {};
    neoLineGetAccountMock
      .mockImplementationOnce(() => new Promise(() => {}));
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
        })
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
    executeMock.mockResolvedValue({ protocol: { network: 123456789 } });

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

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(signTxMock).toHaveBeenCalled();
    const usedMagic = signTxMock.mock.calls.at(-1)?.[1];
    expect(usedMagic).toBe(123456789);
  });

});
