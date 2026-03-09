import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

const createMultisigTableMock = ({ eqResult, unfilteredResult, eqImpl }) => {
  const query = {
    order: vi.fn(() => Promise.resolve(unfilteredResult ?? { data: [], error: null })),
    eq: vi.fn(eqImpl || (() => ({ order: vi.fn(() => Promise.resolve(eqResult ?? { data: [], error: null })) }))),
  };

  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));
  return { from, select, query };
};

describe("supabaseService multisig requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    createClientMock.mockReset();
  });

  it("filters multisig request reads by the requested network when supabase is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const table = createMultisigTableMock({
      eqResult: {
        data: [{ id: 1, network: "testnet", description: "Testnet Request" }],
        error: null,
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequests("testnet");

    expect(table.from).toHaveBeenCalledWith("multisig_requests");
    expect(table.select).toHaveBeenCalledWith("*, signatures:multisig_signatures(*)");
    expect(table.query.eq).toHaveBeenCalledWith("network", "testnet");
    expect(result).toEqual([{ id: 1, network: "testnet", description: "Testnet Request" }]);
  });

  it("falls back to legacy unscoped multisig tables when network columns are unavailable", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const table = createMultisigTableMock({
      unfilteredResult: {
        data: [{ id: 9, description: "Legacy Request" }],
        error: null,
      },
      eqImpl: (column) => ({
        order: vi.fn(() => Promise.reject(new Error(`column "${column}" does not exist`))),
      }),
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequests("testnet");

    expect(table.query.eq).toHaveBeenNthCalledWith(1, "network", "testnet");
    expect(table.query.eq).toHaveBeenNthCalledWith(2, "network_mode", "testnet");
    expect(table.query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: 9, description: "Legacy Request" }]);
  });
});
