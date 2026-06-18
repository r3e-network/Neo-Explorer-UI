import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../src/services/api.js";
import { clearAllCache } from "../../src/services/cache.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

import { executionService } from "../../src/services/executionService.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const executionServicePath = path.resolve(dirname, "../../src/services/executionService.js");

describe("executionService application-log path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllCache();
    api.rpc.mockReset();
    api.safeRpc.mockReset();
    api.safeRpcList.mockReset();
  });

  it("uses the standard cached getapplicationlog RPC path for transaction traces", async () => {
    const indexedTrace = {
      executions: [{ vmstate: "HALT", notifications: [{ eventname: "Transfer" }] }],
    };

    api.safeRpc.mockResolvedValueOnce(indexedTrace);

    const result = await executionService.getExecutionTrace("0xtx-indexed", { forceRefresh: true });

    expect(result).toEqual(indexedTrace);
    expect(api.safeRpc).toHaveBeenCalledTimes(1);
    expect(api.safeRpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-indexed"], null, expect.any(Object));
  });

  it("normalizes flattened transaction application-log shape into executions array", async () => {
    const flattenedTrace = {
      txid: "0xtx-flat",
      trigger: "Application",
      vmstate: "FAULT",
      gasconsumed: "1000",
      notifications: [],
      stack: [],
    };

    api.safeRpc.mockResolvedValueOnce(flattenedTrace);

    const result = await executionService.getExecutionTrace("0xtx-flat", { forceRefresh: true });

    expect(result.executions?.[0]?.vmstate).toBe("FAULT");
    expect(result.executions?.[0]?.trigger).toBe("Application");
    expect(result.executions?.[0]?.gasconsumed).toBe("1000");
  });

  it("keeps notification-less application logs instead of probing legacy fallbacks", async () => {
    const traceWithoutNotifications = {
      txid: "0xtx-missing-state",
      trigger: "Application",
      notifications: [],
      stack: [],
    };

    api.safeRpc.mockResolvedValueOnce(traceWithoutNotifications);

    const result = await executionService.getExecutionTrace("0xtx-missing-state", { forceRefresh: true });

    expect(result).toEqual({
      ...traceWithoutNotifications,
      executions: [
        {
          trigger: "Application",
          vmstate: "",
          exception: null,
          gasconsumed: "0",
          stack: [],
          notifications: [],
        },
      ],
    });
    expect(api.safeRpc).toHaveBeenCalledTimes(1);
  });

  it("uses the same lightweight getapplicationlog path for block application logs", async () => {
    const blockLog = {
      result: [
        {
          trigger: "OnPersist",
          vmstate: "HALT",
          gasconsumed: "42",
          notifications: [],
        },
      ],
    };

    api.safeRpc.mockResolvedValueOnce(blockLog);

    const result = await executionService.getBlockApplicationLog("0xblock", { forceRefresh: true });

    expect(result.executions).toEqual([
      {
        trigger: "OnPersist",
        vmstate: "HALT",
        exception: null,
        gasconsumed: "42",
        stack: [],
        notifications: [],
      },
    ]);
    expect(api.safeRpc).toHaveBeenCalledWith("getapplicationlog", ["0xblock"], null, expect.any(Object));
  });

  it("does not load neon-js from the application-log hot path", () => {
    const source = fs.readFileSync(executionServicePath, "utf8");

    expect(source).not.toContain("@/utils/neonLoader");
    expect(source).not.toContain("callWithRpcEndpointFallback");
    expect(source).toContain('rpcMethod: "getapplicationlog"');
  });
});
