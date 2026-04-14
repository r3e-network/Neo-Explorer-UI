import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("supabaseService multisig requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    createClientMock.mockReset();
    createClientMock.mockReturnValue(null);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("filters multisig request reads by the requested network when supabase is configured", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, network: "testnet", description: "Testnet Request", signatures: [] }],
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequests("testnet");

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl.toString()).toContain("/api/multisig/requests");
    expect(calledUrl.toString()).toContain("network=testnet");
    expect(result).toEqual([{ id: 1, network: "testnet", description: "Testnet Request", signatures: [] }]);
  });

  it("falls back to legacy unscoped multisig tables when network columns are unavailable", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 9, description: "Legacy Request", signatures: [] }],
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequests("testnet");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 9, description: "Legacy Request", signatures: [] }]);
  });

  it("falls back to separate signature queries when the embedded Supabase relationship is unavailable", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          network: "mainnet",
          description: "Recovered Request",
          signatures: [{ signer_address: "NSigner", signature: "ab".repeat(64) }],
        },
      ],
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequests("mainnet");

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
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 7,
        description: "Recovered Request",
        signatures: [{ signer_address: "NSigner" }],
      }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequestById(7, "mainnet");

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl.toString()).toContain("/api/multisig/requests/7");
    expect(calledUrl.toString()).toContain("network=mainnet");
    expect(result?.id).toBe(7);
    expect(result?.signatures).toEqual([{ signer_address: "NSigner" }]);
  });

  it("loads a single multisig request by id with signatures", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 7,
        description: "Proposal",
        signatures: [{ signer_address: "N1" }],
      }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getMultisigRequestById(7);

    expect(result?.id).toBe(7);
    expect(result?.signatures).toEqual([{ signer_address: "N1" }]);
  });

  it("prevents duplicate signatures from the same signer", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Signature from this signer already exists for this request." }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.addMultisigSignature(4, "NSigner", "ab".repeat(64));

    expect(result).toEqual({
      success: false,
      error: "This council member has already signed the proposal.",
    });
  });

  it("retries multisig request inserts without optional columns when legacy schemas reject them", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 11, description: "Legacy Request" }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.createMultisigRequest({
      type: "governance",
      description: "Legacy Request",
      network: "testnet",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.description).toBe("Legacy Request");
    expect(body.network).toBe("testnet");
    expect(result).toEqual({
      success: true,
      data: { id: 11, description: "Legacy Request" },
    });
  });

  it("persists witness metadata into request params when legacy signature schemas reject optional witness columns", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 9, request_id: 4, signer_address: "NSigner" }),
    });

    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.addMultisigSignature(4, "NSigner", "ab".repeat(64), {
      publicKey: "02aa",
      invocationScript: "0c40ab",
      verificationScript: "2102aaac",
      witness: { source: "external_witness" },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.request_id).toBe(4);
    expect(body.signer_address).toBe("NSigner");
    expect(body.public_key).toBe("02aa");
    expect(body.invocation_script).toBe("0c40ab");
    expect(body.witness).toEqual({ source: "external_witness" });
    expect(result).toEqual({
      success: true,
      data: [{ id: 9, request_id: 4, signer_address: "NSigner" }],
    });
  });

  it("hydrates signature witness metadata from request params when joined signature rows lack optional columns", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      }),
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
