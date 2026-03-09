import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
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

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    createClientMock.mockReset();
    createClientMock.mockReturnValue(null);
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
    expect(fetch.mock.calls[0][0]).toContain("/indexer/mainnet/metadata/contracts");
    expect(result["0xabc"]?.name).toBe("Indexed Token");
    expect(result["0xabc"]?.symbol).toBe("ITK");
    expect(result["0xabc"]?.logo_url).toBe("https://example.com/itk.png");
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
});
