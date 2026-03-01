import { beforeEach, describe, expect, it, vi } from "vitest";

const web3AuthAccount = {
  address: "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf",
  publicKey: "03e66f7f5f327f7eb5c11bfb2bde0864e80f98f2f0f9f4f23ae86f0fd82d4f0f60",
  sign: vi.fn(() => "signed-message"),
};

const connectMock = vi.fn(async () => web3AuthAccount);
const getAccountMock = vi.fn(async () => web3AuthAccount);

const invokeScriptMock = vi.fn(async (script) => {
  // Neo RPC expects base64 input; raw hex strings return "Invalid params".
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
    return "51"; // PUSH1 in hex
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
  wallet: { Account: MockWalletAccount },
  sc: {
    ScriptBuilder: MockScriptBuilder,
    ContractParam: { fromJson: (arg) => arg },
  },
  u: {
    str2hexstring: (value) => value,
    HexString: {
      fromHex: (hex) => ({
        toBase64: () => Buffer.from(hex, "hex").toString("base64"),
      }),
    },
  },
}));

vi.mock("../../src/services/walletConnectService.js", () => ({
  walletConnectService: {
    init: vi.fn(),
    connect: vi.fn(),
    account: null,
    invoke: vi.fn(),
    signMessage: vi.fn(),
    disconnect: vi.fn(),
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

describe("walletService Web3Auth invoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const [sendArg] = sendRawTransactionMock.mock.calls[0];
    expect(typeof sendArg).toBe("object");
  });

  it("broadcasts signed transaction via RPC client", async () => {
    const { walletService } = await import("../../src/services/walletService.js");

    await walletService.connect(walletService.PROVIDERS.WEB3AUTH);

    const txid = await walletService.broadcastSignedTx("serialized-transaction");

    expect(sendRawTransactionMock).toHaveBeenCalledWith("serialized-transaction");
    expect(txid).toBe("0xtesttxid");
  });
});

describe("walletService NeoLine invoke signer normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("passes script-hash signer and numeric witness scope to NeoLine dAPI", async () => {
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
    expect(params.signers).toHaveLength(1);
    expect(params.signers[0].scopes).toBe(128);
    expect(params.signers[0].account).toMatch(/^[0-9a-f]{40}$/);
    expect(params.signers[0].account.startsWith("0x")).toBe(false);
    expect("broadcastOverride" in params).toBe(false);
  });

  it("retries NeoLine invoke with MainNet/TestNet alias when provider denies N3* network name", async () => {
    neoLineInvokeMock.mockImplementation(async (params) => {
      if (params.network === "N3MainNet") {
        throw {
          type: "CONNECTION_DENIED",
          description: "The dAPI provider refused to process this request",
        };
      }
      return { txid: "0xalias-network-ok" };
    });

    const { walletService } = await import("../../src/services/walletService.js");

    walletService.disconnect();
    await walletService.connect(walletService.PROVIDERS.NEOLINE);
    const result = await walletService.invoke({
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd",
      operation: "deploy",
      args: [],
      scope: 128,
    });

    expect(result).toEqual({ txid: "0xalias-network-ok" });
    expect(neoLineInvokeMock).toHaveBeenCalledTimes(2);
    expect(neoLineInvokeMock.mock.calls[0][0].network).toBe("N3MainNet");
    expect(neoLineInvokeMock.mock.calls[1][0].network).toBe("MainNet");
  });
});
