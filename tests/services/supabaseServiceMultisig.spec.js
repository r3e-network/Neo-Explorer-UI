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

const createMultisigRelationshipFailureTableMock = ({
  rows = [{ id: 1, network: "mainnet", description: "Recovered Request" }],
  signaturesByRequestId = {},
}) => {
  const signatureQuery = {
    eq: vi.fn((column, value) =>
      Promise.resolve({
        data: column === "request_id" ? signaturesByRequestId[value] || [] : [],
        error: null,
      })
    ),
  };
  const signatureSelect = vi.fn(() => signatureQuery);

  const relationshipQuery = {
    order: vi.fn(() =>
      Promise.resolve({
        data: null,
        error: new Error("Could not find a relationship between 'multisig_requests' and 'multisig_signatures'"),
      })
    ),
  };

  const baseQuery = {
    eq: vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    })),
    order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
  };

  const requestSelect = vi.fn((query) => {
    if (query === "*, signatures:multisig_signatures(*)") return relationshipQuery;
    if (query === "*") return baseQuery;
    throw new Error(`unexpected request select: ${query}`);
  });

  const from = vi.fn((tableName) => {
    if (tableName === "multisig_signatures") {
      return { select: signatureSelect };
    }
    return { select: requestSelect };
  });
  return { from, requestSelect, relationshipQuery, baseQuery, signatureSelect, signatureQuery };
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

const createSignatureFallbackTableMock = ({
  firstInsertError,
  secondInsertResult = { data: [{ id: 9 }], error: null },
}) => {
  const duplicateQuery = {
    eq: vi.fn(() => duplicateQuery),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };

  const insert = vi
    .fn()
    .mockImplementationOnce(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: firstInsertError })),
    }))
    .mockImplementationOnce(() => ({
      select: vi.fn(() => Promise.resolve(secondInsertResult)),
    }));

  const select = vi.fn(() => duplicateQuery);
  return { select, insert, duplicateQuery };
};

const createRequestMetadataTableMock = ({
  requestRow = { id: 4, params: { existing: true } },
  updatedRow,
}) => {
  const selectQuery = {
    eq: vi.fn(() => selectQuery),
    single: vi.fn(() => Promise.resolve({ data: requestRow, error: null })),
  };

  const updateSelect = vi.fn(() =>
    Promise.resolve({
      data: updatedRow ?? requestRow,
      error: null,
    })
  );
  const updateEq = vi.fn(() => ({
    select: updateSelect,
  }));
  const update = vi.fn(() => ({
    eq: updateEq,
  }));

  const select = vi.fn(() => selectQuery);
  return { select, selectQuery, update, updateEq, updateSelect };
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
    expect(table.query.eq).toHaveBeenNthCalledWith(2, "network", "testnet");
    expect(table.query.eq).toHaveBeenNthCalledWith(3, "network_mode", "testnet");
    expect(table.query.eq).toHaveBeenNthCalledWith(4, "network_mode", "testnet");
    expect(table.query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: 9, description: "Legacy Request" }]);
  });

  it("falls back to separate signature queries when the embedded Supabase relationship is unavailable", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const table = createMultisigRelationshipFailureTableMock({
      rows: [{ id: 1, network: "mainnet", description: "Recovered Request" }],
      signaturesByRequestId: {
        1: [{ signer_address: "NSigner", signature: "ab".repeat(64) }],
      },
    });
    createClientMock.mockReturnValue({ from: table.from });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequests("mainnet");

    expect(table.requestSelect).toHaveBeenCalledWith("*, signatures:multisig_signatures(*)");
    expect(result).toEqual([
      {
        id: 1,
        network: "mainnet",
        description: "Recovered Request",
        signatures: [{ signer_address: "NSigner", signature: "ab".repeat(64) }],
      },
    ]);
  });

  it("falls back to a separate signature query for a single request when the embedded relationship is unavailable", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const relationshipError = new Error(
      "Could not find a relationship between 'multisig_requests' and 'multisig_signatures'"
    );
    const requestQuery = {
      eq: vi.fn(() => requestQuery),
      single: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: relationshipError })
        .mockResolvedValueOnce({ data: { id: 7, description: "Recovered Request" }, error: null }),
    };
    const signatureQuery = {
      eq: vi.fn((column, value) =>
        Promise.resolve({
          data: column === "request_id" && value === 7 ? [{ signer_address: "NSigner" }] : [],
          error: null,
        })
      ),
    };
    const requestSelect = vi.fn(() => requestQuery);
    const signatureSelect = vi.fn(() => signatureQuery);

    createClientMock.mockReturnValue({
      from: vi.fn((tableName) =>
        tableName === "multisig_signatures" ? { select: signatureSelect } : { select: requestSelect }
      ),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequestById(7, "mainnet");

    expect(requestSelect).toHaveBeenCalledWith("*, signatures:multisig_signatures(*)");
    expect(requestSelect).toHaveBeenCalledWith("*");
    expect(signatureSelect).toHaveBeenCalledWith("*");
    expect(signatureQuery.eq).toHaveBeenCalledWith("request_id", 7);
    expect(result).toEqual({
      id: 7,
      description: "Recovered Request",
      signatures: [{ signer_address: "NSigner" }],
    });
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

  it("persists witness metadata into request params when legacy signature schemas reject optional witness columns", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const signatureTable = createSignatureFallbackTableMock({
      firstInsertError: new Error('column "witness" of relation "multisig_signatures" does not exist'),
    });
    const requestTable = createRequestMetadataTableMock({
      requestRow: { id: 4, params: { existing: true } },
      updatedRow: {
        id: 4,
        params: {
          existing: true,
          signature_metadata: {
            NSigner: {
              public_key: "02aa",
              invocation_script: "0c40ab",
              verification_script: "2102aaac",
              witness: { source: "external_witness" },
            },
          },
        },
      },
    });

    createClientMock.mockReturnValue({
      from: vi.fn((tableName) => {
        if (tableName === "multisig_signatures") {
          return { select: signatureTable.select, insert: signatureTable.insert };
        }
        if (tableName === "multisig_requests") {
          return { select: requestTable.select, update: requestTable.update };
        }
        return { select: vi.fn() };
      }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.addMultisigSignature(4, "NSigner", "ab".repeat(64), {
      publicKey: "02aa",
      invocationScript: "0c40ab",
      verificationScript: "2102aaac",
      witness: { source: "external_witness" },
    });

    expect(signatureTable.insert).toHaveBeenCalledTimes(2);
    expect(requestTable.select).toHaveBeenCalledWith("id, params");
    expect(requestTable.update).toHaveBeenCalledWith({
      params: {
        existing: true,
        signature_metadata: {
          NSigner: {
            public_key: "02aa",
            invocation_script: "0c40ab",
            verification_script: "2102aaac",
            witness: { source: "external_witness" },
          },
        },
      },
    });
    expect(result).toEqual({
      success: true,
      data: [{ id: 9 }],
    });
  });

  it("hydrates signature witness metadata from request params when joined signature rows lack optional columns", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const table = createRequestByIdTableMock({
      singleResult: {
        data: {
          id: 7,
          params: {
            signature_metadata: {
              NSigner: {
                public_key: "02aa",
                invocation_script: "0c40ab",
                verification_script: "2102aaac",
                witness: { source: "external_witness" },
              },
            },
          },
          signatures: [{ signer_address: "NSigner", signature: "ab".repeat(64) }],
        },
        error: null,
      },
    });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: table.select })),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequestById(7);

    expect(result?.signatures?.[0]).toMatchObject({
      signer_address: "NSigner",
      signature: "ab".repeat(64),
      public_key: "02aa",
      invocation_script: "0c40ab",
      verification_script: "2102aaac",
      witness: { source: "external_witness" },
    });
  });
});
