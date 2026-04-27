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

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
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
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              contract_hash: "0xabc",
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
    const result = await supabaseService.getContractMetadataBatch(["0xabc"]);

    expect(fetch).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toContain("/data/mainnet/metadata/contracts");
    expect(result["0xabc"]?.name).toBe("Indexed Token");
    expect(result["0xabc"]?.symbol).toBe("ITK");
    expect(result["0xabc"]?.logo_url).toBe("https://example.com/itk.png");
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
    const result = await supabaseService.getContractMetadataBatch(["0xabc"], "testnet");

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
        json: async () => ({ data: [{ hash: "0xabc", network: "testnet" }] }),
      })
    );

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMempoolTransactions("testnet", 5000);

    expect(fetch).toHaveBeenCalledWith("/api/mempool?network=testnet&limit=1000");
    expect(createClientMock).not.toHaveBeenCalled();
    expect(result).toEqual([{ hash: "0xabc", network: "testnet" }]);
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
    ]);
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
});
