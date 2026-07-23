import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock, providerRequestMock, getEvmProviderMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  providerRequestMock: vi.fn(),
  getEvmProviderMock: vi.fn(),
}));

vi.mock("@/services/walletService", () => ({
  walletService: { invoke: invokeMock },
}));

vi.mock("@/utils/neoxWallet", () => ({
  getEvmProvider: getEvmProviderMock,
  isUserRejection: (err) =>
    err?.code === 4001 || /user rejected|user denied/i.test(String(err?.message || "")),
}));

import { signProposal, ProposalSignerError } from "../../src/utils/proposalSigner.js";

const n3Proposal = {
  proposal: true,
  chain: "n3",
  kind: "invoke",
  network: "mainnet",
  scriptHash: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
  operation: "transfer",
  from: "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ",
  args: [
    { type: "Hash160", value: "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ", _neon: true },
    { type: "Hash160", value: "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w", _neon: true },
    { type: "Integer", value: "100000000", _neon: true },
    { type: "Any", value: null, _neon: true },
  ],
  signers: [{ account: "0x...", scopes: "CalledByEntry" }],
};

const neoxProposal = {
  proposal: true,
  chain: "neox",
  kind: "eth_tx",
  network: "neox-mainnet",
  tx: {
    from: "0x00000000000000000000000000000000deadbeef",
    to: "0x00000000000000000000000000000000cafebabe",
    value: "0x0",
    data: "0x",
    chainId: "0xba93",
  },
};

describe("proposalSigner.signProposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes an N3 invoke to walletService.invoke with converted args and returns the txid", async () => {
    invokeMock.mockResolvedValue({ txid: "0xN3TXID" });

    const result = await signProposal(n3Proposal);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const params = invokeMock.mock.calls[0][0];
    // Args converted to clean { type, value } dApi pairs — neon extras stripped.
    expect(params.args).toEqual([
      { type: "Hash160", value: "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ" },
      { type: "Hash160", value: "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w" },
      { type: "Integer", value: "100000000" },
      { type: "Any", value: null },
    ]);
    expect(params.args.every((arg) => !("_neon" in arg))).toBe(true);
    expect(params.scriptHash).toBe(n3Proposal.scriptHash);
    expect(params.operation).toBe("transfer");
    // Signers passed straight through; walletService normalizes the scope string.
    expect(params.signers).toEqual([{ account: "0x...", scopes: "CalledByEntry" }]);

    expect(result).toEqual({ chain: "n3", txid: "0xN3TXID" });
  });

  it("routes a Neo X eth_tx to the injected provider and returns the tx hash", async () => {
    providerRequestMock.mockResolvedValue("0xNEOXHASH");
    getEvmProviderMock.mockReturnValue({ request: providerRequestMock });

    const result = await signProposal(neoxProposal);

    expect(providerRequestMock).toHaveBeenCalledTimes(1);
    expect(providerRequestMock).toHaveBeenCalledWith({
      method: "eth_sendTransaction",
      params: [neoxProposal.tx],
    });
    expect(result).toEqual({ chain: "neox", txHash: "0xNEOXHASH" });
  });

  it("throws a typed ProposalSignerError when no EVM provider is present", async () => {
    getEvmProviderMock.mockReturnValue(null);

    await expect(signProposal(neoxProposal)).rejects.toBeInstanceOf(ProposalSignerError);
    await expect(signProposal(neoxProposal)).rejects.toMatchObject({ code: "no_provider" });
    expect(providerRequestMock).not.toHaveBeenCalled();
  });

  it("surfaces a Neo X user rejection tagged for the caller", async () => {
    const rejection = Object.assign(new Error("User rejected the request"), { code: 4001 });
    providerRequestMock.mockRejectedValue(rejection);
    getEvmProviderMock.mockReturnValue({ request: providerRequestMock });

    await expect(signProposal(neoxProposal)).rejects.toMatchObject({ userRejected: true });
  });

  it("surfaces an N3 user rejection tagged for the caller", async () => {
    invokeMock.mockRejectedValue(Object.assign(new Error("user rejected"), { code: 4001 }));

    await expect(signProposal(n3Proposal)).rejects.toMatchObject({ userRejected: true });
  });

  it("rejects an unsupported proposal shape", async () => {
    await expect(signProposal({ chain: "solana" })).rejects.toBeInstanceOf(ProposalSignerError);
    await expect(signProposal(null)).rejects.toBeInstanceOf(ProposalSignerError);
  });

  it("only ever calls the wallet's send/invoke path — no signing primitives", async () => {
    invokeMock.mockResolvedValue({ txid: "0x1" });
    providerRequestMock.mockResolvedValue("0x2");
    getEvmProviderMock.mockReturnValue({ request: providerRequestMock });

    await signProposal(n3Proposal);
    await signProposal(neoxProposal);

    // The EVM provider is only asked to send a transaction — never to sign a
    // raw payload / message / typed data (those would expose key material).
    for (const [arg] of providerRequestMock.mock.calls) {
      expect(arg.method).toBe("eth_sendTransaction");
    }

    // The module source contains no signing / private-key logic whatsoever.
    const source = readFileSync(
      resolve(process.cwd(), "src/utils/proposalSigner.js"),
      "utf8",
    );
    expect(source).not.toMatch(/eth_sign|personal_sign|signTransaction|signTypedData/i);
    expect(source).not.toMatch(/privateKey|private_key|\bWIF\b|secretKey|mnemonic/i);
  });
});
