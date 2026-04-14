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

const createSupabaseTableMock = ({ eqResult, unfilteredResult, eqImpl }) => {
  const query = Promise.resolve(unfilteredResult ?? { data: [], error: null });
  query.eq = vi.fn(eqImpl || (() => Promise.resolve(eqResult ?? { data: [], error: null })));

  const inMock = vi.fn(() => query);
  const select = vi.fn(() => ({ in: inMock }));
  const from = vi.fn(() => ({ select }));

  return { from, select, inMock, query };
};

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

  it("fetches contract metadata from indexer endpoint before direct supabase table reads", async () => {
    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xabc"]);

    expect(fetch).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toContain("/data/mainnet/metadata/contracts");
    expect(result["0xabc"]?.name).toBe("Indexed Token");
    expect(result["0xabc"]?.symbol).toBe("ITK");
    expect(result["0xabc"]?.logo_url).toBe("https://example.com/itk.png");
  });

  it("rewrites legacy hosted Supabase client URLs to the worker base URL", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://xistvcqaiusnhrujnpaz.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const client = { from: vi.fn() };
    createClientMock.mockReturnValue(client);

    const { supabase } = await import("../../src/services/supabaseService.js");

    expect(createClientMock).toHaveBeenCalledWith("https://api.n3index.dev", "anon-key");
    expect(supabase).toBe(client);
  });

  it("filters contract metadata supabase fallback queries by the requested network", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("indexer unavailable")));

    const table = createSupabaseTableMock({
      eqResult: {
        data: [{ contract_hash: "0xabc", display_name: "Testnet Token" }],
        error: null,
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xabc"], "testnet");

    expect(table.from).toHaveBeenCalledWith("contract_metadata");
    expect(table.select).toHaveBeenCalledWith("*");
    expect(table.inMock).toHaveBeenCalledWith("contract_hash", ["0xabc"]);
    expect(table.query.eq).toHaveBeenCalledWith("network", "testnet");
    expect(result["0xabc"]?.name).toBe("Testnet Token");
  });

  it("falls back to legacy unscoped contract metadata tables when network columns are unavailable", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("indexer unavailable")));

    const table = createSupabaseTableMock({
      unfilteredResult: {
        data: [{ contract_hash: "0xlegacy", display_name: "Legacy Token" }],
        error: null,
      },
      eqImpl: (column) => {
        if (column === "network") {
          return Promise.reject(new Error('column "network" does not exist'));
        }
        if (column === "network_mode") {
          return Promise.reject(new Error('column "network_mode" does not exist'));
        }
        return Promise.resolve({ data: [], error: null });
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xlegacy"], "testnet");

    expect(table.query.eq).toHaveBeenNthCalledWith(1, "network", "testnet");
    expect(table.query.eq).toHaveBeenNthCalledWith(2, "network_mode", "testnet");
    expect(result["0xlegacy"]?.name).toBe("Legacy Token");
  });

  it("filters address tag supabase fallback queries by the requested network", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("indexer unavailable")));

    const table = createSupabaseTableMock({
      eqResult: {
        data: [{ address: "Nabc", label: "Testnet Label", category: "exchange" }],
        error: null,
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch(["Nabc"], "testnet");

    expect(table.from).toHaveBeenCalledWith("address_tags");
    expect(table.select).toHaveBeenCalledWith("address, label, category");
    expect(table.inMock).toHaveBeenCalledWith("address", ["Nabc"]);
    expect(table.query.eq).toHaveBeenCalledWith("network", "testnet");
    expect(result.Nabc?.label).toBe("Testnet Label");
  });

  it("skips Supabase fallback for transient indexer transport aborts", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("Failed to fetch"), { name: "AbortError" }))
    );

    const table = createSupabaseTableMock({
      eqResult: {
        data: [{ address: "Nabc", label: "Should Not Load", category: "exchange" }],
        error: null,
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch(["Nabc"], "testnet");

    expect(table.from).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("skips contract metadata Supabase fallback for transient indexer transport aborts", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("Failed to fetch"), { name: "AbortError" }))
    );

    const table = createSupabaseTableMock({
      eqResult: {
        data: [{ contract_hash: "0xabc", display_name: "Should Not Load" }],
        error: null,
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xabc"], "testnet");

    expect(table.from).not.toHaveBeenCalled();
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

  it("still falls back to Supabase when the indexer fails with a generic fetch error", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    const table = createSupabaseTableMock({
      eqResult: {
        data: [{ address: "Nabc", label: "Recovered Label", category: "exchange" }],
        error: null,
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getAddressTagsBatch(["Nabc"], "testnet");

    expect(table.from).toHaveBeenCalledWith("address_tags");
    expect(result.Nabc?.label).toBe("Recovered Label");
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
          "https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
      }),
    ]);
  });
});
