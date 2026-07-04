import { describe, expect, it } from "vitest";

import {
  buildConsensusStatusRows,
  expectedPrimaryIndexForBlock,
} from "@/services/consensusStatusService";

describe("consensusStatusService", () => {
  it("derives expected primary slots from block height", () => {
    expect(expectedPrimaryIndexForBlock(11226775, 7)).toBe(11226775 % 7);
    expect(expectedPrimaryIndexForBlock("bad", 7)).toBeNull();
    expect(expectedPrimaryIndexForBlock(100, 0)).toBeNull();
  });

  it("marks missed expected-primary slots as view changes and exposes node health", () => {
    const rows = buildConsensusStatusRows({
      validatorCount: 7,
      blocks: [
        { height: 100, primaryNode: 2 },
        { height: 101, primaryNode: 4 },
        { height: 102, primaryNode: 4 },
        { height: 103, primaryNode: 5 },
      ],
      liveness: {
        3: { nodeIndex: 3, proposed: 0, missed: 1, ratio: 0 },
        4: { nodeIndex: 4, proposed: 2, missed: 0, ratio: 100 },
      },
      resolveName: (index) => `Node ${index}`,
      resolveAddress: (index) => `N${index}`,
      resolveLogo: (index) => `/logos/${index}.png`,
    });

    expect(rows).toHaveLength(7);
    expect(rows[3]).toMatchObject({
      nodeIndex: 3,
      name: "Node 3",
      address: "N3",
      logoUrl: "/logos/3.png",
      recentMissed: 1,
      recentViewChanges: 1,
      livenessRatio: 0,
      status: "degraded",
    });
    expect(rows[3].timeline).toContainEqual(
      expect.objectContaining({
        height: 101,
        expectedPrimary: 3,
        actualPrimary: 4,
        state: "view-change",
      }),
    );
    expect(rows[4]).toMatchObject({
      recentRecovered: 1,
      livenessRatio: 100,
      status: "healthy",
    });
  });

  it("falls back to recent block slots when cached liveness is unavailable", () => {
    const rows = buildConsensusStatusRows({
      validatorCount: 7,
      blocks: [
        { height: 98, primary_node: 0 },
        { height: 105, primary_node: 2 },
      ],
    });

    expect(rows[0]).toMatchObject({
      recentExpected: 2,
      recentProposed: 1,
      recentMissed: 1,
      livenessRatio: 50,
      status: "degraded",
    });
  });
});
