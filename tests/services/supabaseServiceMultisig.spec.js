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

const createRequestByIdTableMock = ({ singleResult }) => {
  const query = {
    eq: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(singleResult ?? { data: null, error: null })),
  };
  const select = vi.fn(() => query);
  return { select, query };
};

const createSignatureDuplicateTableMock = ({ existingRows = [], insertResult = { data: [{ id: 9 }], error: null } }) => {
  const duplicateQuery = {
    eq: vi.fn(() => duplicateQuery),
    maybeSingle: vi.fn(async () =>
      existingRows.length > 0 ? { data: existingRows[0], error: null } : { data: null, error: null }
    ),
  };

  const insert = vi.fn(() => ({
    select: vi.fn(() => Promise.resolve(insertResult)),
  }));

  const select = vi.fn(() => duplicateQuery);
  return { select, insert, duplicateQuery };
};

const createRequestInsertTableMock = ({ firstInsertError, secondInsertResult }) => {
  const insert = vi
    .fn()
    .mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: firstInsertError })),
      })),
    }))
    .mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(secondInsertResult ?? { data: { id: 1 }, error: null })),
      })),
    }));

  return { insert };
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

  it("loads a single multisig request by id with signatures", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const table = createRequestByIdTableMock({
      singleResult: {
        data: {
          id: 7,
          description: "Proposal",
          signatures: [{ signer_address: "N1" }],
        },
        error: null,
      },
    });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: table.select })),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequestById(7);

    expect(table.select).toHaveBeenCalledWith("*, signatures:multisig_signatures(*)");
    expect(table.query.eq).toHaveBeenCalledWith("id", 7);
    expect(result?.id).toBe(7);
    expect(result?.signatures).toEqual([{ signer_address: "N1" }]);
  });

  it("prevents duplicate signatures from the same signer", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const signatureTable = createSignatureDuplicateTableMock({
      existingRows: [{ id: 1, signer_address: "NSigner" }],
    });

    createClientMock.mockReturnValue({
      from: vi.fn((tableName) => {
        if (tableName === "multisig_signatures") {
          return { select: signatureTable.select, insert: signatureTable.insert };
        }
        return { select: vi.fn() };
      }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.addMultisigSignature(4, "NSigner", "ab".repeat(64));

    expect(signatureTable.select).toHaveBeenCalledWith("id, signer_address");
    expect(result).toEqual({
      success: false,
      error: "This council member has already signed the proposal.",
    });
  });

  it("retries multisig request inserts without optional columns when legacy schemas reject them", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const table = createRequestInsertTableMock({
      firstInsertError: new Error('column "type" of relation "multisig_requests" does not exist'),
      secondInsertResult: { data: { id: 11, description: "Legacy Request" }, error: null },
    });

    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: table.insert })),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.createMultisigRequest({
      type: "governance",
      description: "Legacy Request",
      network: "testnet",
      eligible_signers: ["A1"],
    });

    expect(table.insert).toHaveBeenCalledTimes(2);
    expect(table.insert.mock.calls[0][0][0]).toMatchObject({
      type: "governance",
      description: "Legacy Request",
      network: "testnet",
      eligible_signers: ["A1"],
    });
    expect(table.insert.mock.calls[1][0][0]).toMatchObject({
      description: "Legacy Request",
      network: "testnet",
      eligible_signers: ["A1"],
    });
    expect(table.insert.mock.calls[1][0][0].type).toBeUndefined();
    expect(result).toEqual({
      success: true,
      data: { id: 11, description: "Legacy Request" },
    });
  });
});
