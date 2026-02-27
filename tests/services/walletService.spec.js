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

vi.mock("@cityofzion/neon-js", () => ({
  rpc: { RPCClient: MockRpcClient },
  tx: { Transaction: MockTransaction },
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

  it("converts script to HexString/base64 before invokescript RPC", async () => {
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
  });
});
