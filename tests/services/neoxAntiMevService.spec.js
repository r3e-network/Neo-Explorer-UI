import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/neox/blockscoutClient", () => ({
  LIST_TIMEOUT_MS: 12_000,
  fetchBlockscout: vi.fn(),
}));

vi.mock("@/services/neox/rpcService", () => ({
  rpcService: {
    getRpcBlockNumber: vi.fn(),
    getEnvelopeFee: vi.fn(),
  },
}));

import { fetchBlockscout } from "@/services/neox/blockscoutClient";
import { rpcService } from "@/services/neox/rpcService";
import { antiMevService } from "@/services/neox/antiMevService";

const target = "0x1212000000000000000000000000000000000003";
const u32 = (value) => Number(value).toString(16).padStart(8, "0");
const input = `0xffffffff${u32(54)}${u32(21_000)}${"11".repeat(32)}${"00".repeat(304)}`;

describe("Neo X antiMevService", () => {
  beforeEach(() => {
    antiMevService.clearCache();
    vi.clearAllMocks();
  });

  it("combines live policy and indexed Envelope observations", async () => {
    rpcService.getRpcBlockNumber.mockResolvedValue(7_157_209);
    rpcService.getEnvelopeFee.mockResolvedValue("0");
    fetchBlockscout.mockResolvedValue({
      items: [
        {
          hash: "0xabc",
          block_number: 5_271_676,
          from: { hash: "0xfrom" },
          to: { hash: target },
          type: 2,
          raw_input: input,
        },
      ],
    });

    await expect(antiMevService.getStatus({ net: "neox-mainnet" })).resolves.toMatchObject({
      active: true,
      envelopeFeeWei: "0",
      latestDkgRound: 54,
      availability: { rpc: true, policy: true, explorer: true },
    });
  });

  it("degrades individual live sources without hiding protocol activation metadata", async () => {
    rpcService.getRpcBlockNumber.mockRejectedValue(new Error("down"));
    rpcService.getEnvelopeFee.mockRejectedValue(new Error("down"));
    fetchBlockscout.mockRejectedValue(new Error("down"));

    await expect(antiMevService.getStatus({ net: "neox-testnet" })).resolves.toMatchObject({
      activationHeight: 2_088_000,
      active: null,
      recentEnvelopes: [],
      availability: { rpc: false, policy: false, explorer: false },
    });
  });
});
