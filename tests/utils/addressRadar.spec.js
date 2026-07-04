import { describe, expect, it } from "vitest";
import {
  buildAddressRadarGraph,
  buildAddressRadarPathGraph,
  findAddressTransferPath,
} from "@/utils/addressRadar";

const CENTER = "Ncenter111111111111111111111111111111";
const ALICE = "NAlice1111111111111111111111111111111";
const BOB = "NBob11111111111111111111111111111111";
const CAROL = "NCarol111111111111111111111111111111";
const TARGET = "NTarget11111111111111111111111111111";

describe("addressRadar graph builder", () => {
  it("aggregates inbound and outbound counterparties around the viewed address", () => {
    const graph = buildAddressRadarGraph({
      centerAddress: CENTER,
      nep17Transfers: [
        {
          txHash: "0x-in-1",
          from: ALICE,
          to: CENTER,
          amount: "10",
          tokenName: "GAS",
          tokenHash: "0xd2a4",
          timestamp: 100,
        },
        {
          txHash: "0x-in-2",
          from: ALICE,
          to: CENTER,
          amount: "5",
          tokenName: "GAS",
          tokenHash: "0xd2a4",
          timestamp: 90,
        },
        {
          txHash: "0x-out-1",
          from: CENTER,
          to: BOB,
          amount: "3",
          tokenName: "NEO",
          tokenHash: "0xef40",
          timestamp: 80,
        },
      ],
      nep11Transfers: [
        {
          txHash: "0x-nft-1",
          from: CENTER,
          to: CAROL,
          tokenName: "NeoGhost",
          tokenHash: "0xghost",
          tokenId: "42",
          timestamp: 70,
        },
      ],
    });

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: CENTER, role: "center", inCount: 2, outCount: 2 }),
        expect.objectContaining({ address: ALICE, role: "source", outCount: 2 }),
        expect.objectContaining({ address: BOB, role: "sink", inCount: 1 }),
        expect.objectContaining({ address: CAROL, role: "sink", inCount: 1 }),
      ]),
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: ALICE,
          to: CENTER,
          count: 2,
          tokens: expect.arrayContaining(["GAS"]),
        }),
        expect.objectContaining({
          from: CENTER,
          to: BOB,
          count: 1,
          tokens: expect.arrayContaining(["NEO"]),
        }),
        expect.objectContaining({
          from: CENTER,
          to: CAROL,
          count: 1,
          tokens: expect.arrayContaining(["NeoGhost"]),
        }),
      ]),
    );
    expect(graph.summary).toMatchObject({
      inboundAccounts: 1,
      outboundAccounts: 2,
      transferCount: 4,
    });
  });

  it("drops malformed/self-loop rows and caps noisy counterparties deterministically", () => {
    const graph = buildAddressRadarGraph({
      centerAddress: CENTER,
      maxCounterparties: 1,
      nep17Transfers: [
        { txHash: "0x-self", from: CENTER, to: CENTER, tokenName: "GAS" },
        { txHash: "0x-missing-to", from: ALICE, tokenName: "GAS" },
        { txHash: "0x-bob-1", from: CENTER, to: BOB, tokenName: "GAS", timestamp: 1 },
        { txHash: "0x-bob-2", from: CENTER, to: BOB, tokenName: "GAS", timestamp: 2 },
        { txHash: "0x-carol-1", from: CENTER, to: CAROL, tokenName: "GAS", timestamp: 3 },
      ],
    });

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ from: CENTER, to: BOB, count: 2 });
    expect(graph.summary.hiddenCounterparties).toBe(1);
  });
});

describe("addressRadar path finder", () => {
  it("finds a multi-hop transfer path between two accounts", async () => {
    const transfersByAddress = new Map([
      [CENTER, [{ txHash: "0x-a", from: CENTER, to: ALICE, tokenName: "GAS" }]],
      [ALICE, [{ txHash: "0x-b", from: ALICE, to: BOB, tokenName: "GAS" }]],
      [BOB, [{ txHash: "0x-c", from: BOB, to: TARGET, tokenName: "GAS" }]],
    ]);

    const result = await findAddressTransferPath({
      sourceAddress: CENTER,
      targetAddress: TARGET,
      maxDepth: 3,
      fetchTransfers: async (address) => transfersByAddress.get(address) || [],
    });

    expect(result.found).toBe(true);
    expect(result.depth).toBe(3);
    expect(result.nodes.map((node) => node.address)).toEqual([CENTER, ALICE, BOB, TARGET]);
    expect(result.edges.map((edge) => edge.txHash)).toEqual(["0x-a", "0x-b", "0x-c"]);
  });

  it("converts a found path into a renderable radar graph", async () => {
    const pathResult = {
      found: true,
      depth: 2,
      visitedCount: 3,
      nodes: [
        { id: CENTER.toLowerCase(), address: CENTER, role: "source" },
        { id: ALICE.toLowerCase(), address: ALICE, role: "bridge" },
        { id: TARGET.toLowerCase(), address: TARGET, role: "target" },
      ],
      edges: [
        { txHash: "0x-a", from: CENTER, to: ALICE, tokenName: "GAS", timestamp: 10 },
        { txHash: "0x-b", from: ALICE, to: TARGET, tokenName: "NEO", timestamp: 20 },
      ],
    };

    const graph = buildAddressRadarPathGraph(pathResult);

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: CENTER, role: "source", outCount: 1 }),
        expect.objectContaining({ address: ALICE, role: "bridge", inCount: 1, outCount: 1 }),
        expect.objectContaining({ address: TARGET, role: "target", inCount: 1 }),
      ]),
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: CENTER,
          to: ALICE,
          count: 1,
          tokens: ["GAS"],
          txHashes: ["0x-a"],
        }),
        expect.objectContaining({
          from: ALICE,
          to: TARGET,
          count: 1,
          tokens: ["NEO"],
          txHashes: ["0x-b"],
        }),
      ]),
    );
    expect(graph.summary).toMatchObject({
      transferCount: 2,
      pathDepth: 2,
      visitedCount: 3,
    });
  });

  it("stops searching when depth or visited limits are exhausted", async () => {
    const result = await findAddressTransferPath({
      sourceAddress: CENTER,
      targetAddress: TARGET,
      maxDepth: 1,
      maxVisited: 2,
      fetchTransfers: async (address) => {
        if (address === CENTER) return [{ txHash: "0x-a", from: CENTER, to: ALICE }];
        if (address === ALICE) return [{ txHash: "0x-b", from: ALICE, to: TARGET }];
        return [];
      },
    });

    expect(result.found).toBe(false);
    expect(result.exhausted).toBe(true);
    expect(result.visitedCount).toBeLessThanOrEqual(2);
  });

  it("clamps browser-side path search fanout as a defense-in-depth fallback", async () => {
    const fetchTransfers = vi.fn(async () => [
      { txHash: "0x-a", from: CENTER, to: ALICE },
      { txHash: "0x-b", from: ALICE, to: TARGET },
    ]);

    await findAddressTransferPath({
      sourceAddress: CENTER,
      targetAddress: TARGET,
      maxDepth: 99,
      maxVisited: 999,
      perAddressLimit: 999,
      fetchTransfers,
    });

    expect(fetchTransfers).toHaveBeenCalledWith(CENTER, expect.objectContaining({
      limit: 30,
      depth: 0,
    }));
  });

  it("aborts browser-side path search before doing fetch work", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchTransfers = vi.fn(async () => []);

    await expect(findAddressTransferPath({
      sourceAddress: CENTER,
      targetAddress: TARGET,
      fetchTransfers,
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchTransfers).not.toHaveBeenCalled();
  });
});
