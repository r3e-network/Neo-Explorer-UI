import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addressToScriptHash,
  bytesToBase64,
  hexToBytes,
  reverseHex,
  scriptHashToAddress,
  strip0x,
} from "@/utils/neoHelpers";

const createClientMock = vi.hoisted(() => vi.fn(() => null));
const rpcMock = vi.hoisted(() => vi.fn());
const walletServiceMock = vi.hoisted(() => ({
  signMessage: vi.fn(),
  getPublicKey: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

describe("supabaseService metadata", () => {
  let consoleWarnSpy;
  let consoleErrorSpy;
  const encodeByteString = (value) => bytesToBase64(new TextEncoder().encode(String(value || "")));
  const encodeHash160ByteString = (address) => {
    const scriptHash = addressToScriptHash(address);
    return bytesToBase64(hexToBytes(reverseHex(strip0x(scriptHash))));
  };
  const buildCandidateInfoResult = ({
    address = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w",
    name = "COZ",
    icon = "https://example.com/coz.png",
  } = {}) => ({
    stack: [
      {
        type: "Array",
        value: [
          {
            type: "Array",
            value: [
              { type: "ByteString", value: encodeHash160ByteString(address) },
              { type: "ByteString", value: encodeByteString(name) },
              { type: "ByteString", value: encodeByteString("United States") },
              { type: "ByteString", value: encodeByteString("https://example.com") },
              { type: "ByteString", value: encodeByteString("node@example.com") },
              { type: "ByteString", value: encodeByteString("https://github.com/example") },
              { type: "ByteString", value: encodeByteString("https://t.me/example") },
              { type: "ByteString", value: encodeByteString("https://x.com/example") },
              { type: "ByteString", value: encodeByteString("Example council node") },
              { type: "ByteString", value: encodeByteString(icon) },
            ],
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    createClientMock.mockReset();
    createClientMock.mockReturnValue(null);
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ stack: [{ type: "Array", value: [] }] });
    walletServiceMock.signMessage.mockReset();
    walletServiceMock.signMessage.mockResolvedValue({
      signature: "ab".repeat(64),
      publicKey: `02${"11".repeat(32)}`,
    });
    walletServiceMock.getPublicKey.mockReset();
    walletServiceMock.getPublicKey.mockResolvedValue(`02${"11".repeat(32)}`);
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              contract_hash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
              display_name: "Indexed Token",
              symbol: "ITK",
              logo_url: "https://example.com/itk.png",
            },
          ],
        }),
      })
    );
  });

  afterEach(() => {
    consoleWarnSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it("fetches contract metadata from the indexer endpoint", async () => {
    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"]);

    expect(fetch).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toContain("/data/mainnet/metadata/contracts");
    expect(result["0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"]?.name).toBe("Indexed Token");
    expect(result["0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"]?.symbol).toBe("ITK");
    expect(result["0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"]?.logo_url).toBe("https://example.com/itk.png");
  });

  it("keeps browser service free of direct Supabase table queries", async () => {
    const { supabase } = await import("../../src/services/supabaseService.js");
    expect(supabase).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("keeps browser metadata reads on the indexer when it aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("Failed to fetch"), { name: "AbortError" }))
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch(["Nabc"], "testnet");

    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("keeps browser contract metadata reads on the indexer when it aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("Failed to fetch"), { name: "AbortError" }))
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"], "testnet");

    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("returns empty when the single indexer metadata route aborts", async () => {
    const address = "Nabc";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("Failed to fetch"), { name: "AbortError" })),
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch([address], "mainnet");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain("/data/mainnet/metadata/addresses");
    expect(result).toEqual({});
  });

  it("does not fall back to direct Supabase table reads when the indexer fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch(["Nabc"], "testnet");

    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("loads mempool transactions through the server API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ hash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", network: "testnet" }] }),
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMempoolTransactions("testnet", 5000);

    expect(fetch).toHaveBeenCalledWith("/api/mempool?network=testnet&limit=1000");
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toEqual([{ hash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", network: "testnet" }]);
  });

  it("signs multisig status mutations and stores broadcast witness in metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 42, status: "EXECUTED" }),
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.updateMultisigRequestStatus(42, "EXECUTED", {
      signer_address: "Nsigner",
      tx_hash: `0x${"12".repeat(32)}`,
      executed_at: "2026-06-20T10:00:00.000Z",
      network: "testnet",
      metadata: { reviewer: "ops" },
      params: {
        broadcast_witness: {
          invocationScript: "aa",
          verificationScript: "bb",
        },
      },
    });

    expect(result.success).toBe(true);
    const signedMessage = walletServiceMock.signMessage.mock.calls[0][0];
    expect(signedMessage).toContain("Neo Explorer Multisig Mutation v2");
    expect(signedMessage).toContain("Network: testnet");
    expect(signedMessage).toContain(
      'Metadata: {"broadcast_witness":{"invocationScript":"aa","verificationScript":"bb"},"reviewer":"ops"}',
    );
    // Replay protection: the signed message carries a fresh timestamp.
    expect(signedMessage).toMatch(/Signed At: \d+/);
    expect(fetch).toHaveBeenCalledWith(
      "/api/multisig/requests/42",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.params).toBeUndefined();
    expect(body.metadata).toEqual({
      reviewer: "ops",
      broadcast_witness: {
        invocationScript: "aa",
        verificationScript: "bb",
      },
    });
    expect(body.mutation_signature).toBe("ab".repeat(64));
    expect(body.mutation_public_key).toBe(`02${"11".repeat(32)}`);
    // The timestamp sent to the server must equal the one bound into the signed message.
    expect(typeof body.mutation_signed_at).toBe("number");
    expect(signedMessage).toContain(`Signed At: ${body.mutation_signed_at}`);
  });

  it("maps script-hash metadata rows back to the requested base58 address", async () => {
    const scriptHash = "0x017520f068fd602082fe5572596185e62a4ad991";
    const address = scriptHashToAddress(scriptHash);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              address: scriptHash,
              nns_domain: "oracle.morpheus.neo",
              nns_expiration_ms: Date.now() + 60_000,
            },
          ],
        }),
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch([address], "mainnet");

    expect(fetch).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toContain("/data/mainnet/metadata/addresses");
    expect(result[address]?.nns_domain).toBe("oracle.morpheus.neo");
  });

  it("collapses duplicated nns domains from metadata payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              address: "0x03013f49c42a14546c8bbe58f9d434c3517fccab",
              nns_domain: "pricefeed.morpheus.neopricefeed.morpheus.neo",
              nns_expiration_ms: Date.now() + 60_000,
            },
          ],
        }),
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTag("0x03013f49c42a14546c8bbe58f9d434c3517fccab", "mainnet");

    expect(result?.nns_domain).toBe("pricefeed.morpheus.neo");
  });

  it("merges real governance candidate icons into validator metadata rows matched by address", async () => {
    const address = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              public_key: "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b",
              address,
              display_name: "",
              logo_url: "",
            },
          ],
        }),
      })
    );
    rpcMock.mockResolvedValueOnce(
      buildCandidateInfoResult({
        address,
        name: "COZ Council",
        icon: "https://cdn.example.com/council/coz.png",
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getValidatorMetadata("mainnet");

    expect(rpcMock).toHaveBeenCalledWith("invokefunction", [
      "0xb776afb6ad0c11565e70f8ee1dd898da43e51be1",
      "getAllInfo",
      [],
    ], { network: "mainnet" });
    expect(result).toHaveLength(1);
    expect(result[0].display_name).toBe("COZ Council");
    expect(result[0].logo_url).toBe("https://cdn.example.com/council/coz.png");
  });

  it("returns governance candidate rows even when the indexer validator metadata list is empty", async () => {
    const address = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })
    );
    rpcMock.mockResolvedValueOnce(
      buildCandidateInfoResult({
        address,
        name: "COZ Council",
        icon: "CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getValidatorMetadata("mainnet");

    expect(result).toEqual([
      expect.objectContaining({
        address,
        display_name: "COZ Council",
        logo_url:
          "https://rest.fs.neo.org/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
      }),
    ]);
  });

  it("routes governance candidate metadata RPC through the requested network", async () => {
    const address = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })
    );
    rpcMock.mockResolvedValueOnce(
      buildCandidateInfoResult({
        address,
        name: "Test Council",
        icon: "https://cdn.example.com/test.png",
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getValidatorMetadata("testnet");

    expect(fetch.mock.calls[0][0]).toContain("/data/testnet/metadata/validators");
    expect(rpcMock).toHaveBeenCalledWith("invokefunction", [
      "0x6177bfcef0f51b5dd21b183ff89e301b9c66d71c",
      "getAllInfo",
      [],
    ], { network: "testnet" });
    expect(result[0]).toEqual(expect.objectContaining({ display_name: "Test Council" }));
  });
});
