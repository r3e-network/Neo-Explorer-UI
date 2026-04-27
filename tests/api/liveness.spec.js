import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const edgeGetMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/edge-config", () => ({
  get: edgeGetMock,
}));

describe("api/liveness", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects unsupported network keys", async () => {
    const handler = (await import("../../api/liveness.js")).default || (await import("../../api/liveness.js"));
    const response = await handler(new Request("https://example.com/api/liveness?network=../../secret"));

    expect(response.status).toBe(400);
    expect(edgeGetMock).not.toHaveBeenCalled();
  });

  it("keeps liveness lookup constrained to the validated network suffix", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "api/liveness.js"), "utf8");
    expect(source).toContain("VALID_NETWORKS");
    expect(source).toContain("liveness_${network}");
  });
});
