import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("supabaseService metadata", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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

  it("fetches contract metadata from indexer endpoint before direct supabase table reads", async () => {
    const { supabaseService } = await import("../../src/services/supabaseService.js");
    const result = await supabaseService.getContractMetadataBatch(["0xabc"]);

    expect(fetch).toHaveBeenCalled();
    expect(fetch.mock.calls[0][0]).toContain("/indexer/mainnet/metadata/contracts");
    expect(result["0xabc"]?.name).toBe("Indexed Token");
    expect(result["0xabc"]?.symbol).toBe("ITK");
    expect(result["0xabc"]?.logo_url).toBe("https://example.com/itk.png");
  });
});

