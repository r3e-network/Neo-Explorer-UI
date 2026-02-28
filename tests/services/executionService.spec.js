import { beforeEach, describe, expect, it, vi } from "vitest";
import { executionService } from "../../src/services/executionService.js";
import * as api from "../../src/services/api.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

describe("executionService getExecutionTrace fallback behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses indexed execution trace when notifications are present", async () => {
    const indexedTrace = {
      executions: [{ vmstate: "HALT", notifications: [{ eventname: "Transfer" }] }],
    };

    api.safeRpc.mockImplementation(async (method) => {
      if (method === "GetApplicationLogByTransactionHash") return indexedTrace;
      if (method === "getapplicationlog") return null;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-indexed", { forceRefresh: true });

    expect(result).toEqual(indexedTrace);
    expect(api.safeRpc).toHaveBeenCalledWith(
      "GetApplicationLogByTransactionHash",
      { TransactionHash: "0xtx-indexed" },
      null
    );
    expect(api.safeRpc).not.toHaveBeenCalledWith("getapplicationlog", ["0xtx-indexed"], null);
  });

  it("falls back to legacy execution trace when indexed notifications are empty", async () => {
    const indexedTrace = {
      executions: [{ vmstate: "HALT", notifications: [] }],
    };
    const legacyTrace = {
      executions: [{ vmstate: "HALT", notifications: [{ eventname: "UserWithdrew" }] }],
    };

    api.safeRpc.mockImplementation(async (method) => {
      if (method === "GetApplicationLogByTransactionHash") return indexedTrace;
      if (method === "getapplicationlog") return legacyTrace;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-fallback", { forceRefresh: true });

    expect(result).toEqual(legacyTrace);
    expect(api.safeRpc).toHaveBeenCalledWith(
      "GetApplicationLogByTransactionHash",
      { TransactionHash: "0xtx-fallback" },
      null
    );
    expect(api.safeRpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-fallback"], null);
  });

  it("uses legacy result when indexed trace is unavailable", async () => {
    const legacyTrace = {
      executions: [{ vmstate: "FAULT", notifications: [{ eventname: "Transfer" }] }],
    };

    api.safeRpc.mockImplementation(async (method) => {
      if (method === "GetApplicationLogByTransactionHash") return null;
      if (method === "getapplicationlog") return legacyTrace;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-legacy", { forceRefresh: true });

    expect(result).toEqual(legacyTrace);
    expect(api.safeRpc).toHaveBeenCalledWith(
      "GetApplicationLogByTransactionHash",
      { TransactionHash: "0xtx-legacy" },
      null
    );
    expect(api.safeRpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-legacy"], null);
  });

  it("normalizes flattened indexed trace shape into executions array", async () => {
    const indexedTrace = {
      txid: "0xtx-flat",
      trigger: "Application",
      vmstate: "FAULT",
      gasconsumed: "1000",
      notifications: [],
      stack: [],
    };

    api.safeRpc.mockImplementation(async (method) => {
      if (method === "GetApplicationLogByTransactionHash") return indexedTrace;
      if (method === "getapplicationlog") return null;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-flat", { forceRefresh: true });

    expect(result.executions?.[0]?.vmstate).toBe("FAULT");
    expect(result.executions?.[0]?.trigger).toBe("Application");
  });

  it("prefers legacy trace when indexed trace lacks vmstate but legacy has it", async () => {
    const indexedTrace = {
      txid: "0xtx-missing-state",
      trigger: "Application",
      notifications: [],
      stack: [],
    };
    const legacyTrace = {
      executions: [{ vmstate: "FAULT", notifications: [] }],
    };

    api.safeRpc.mockImplementation(async (method) => {
      if (method === "GetApplicationLogByTransactionHash") return indexedTrace;
      if (method === "getapplicationlog") return legacyTrace;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-missing-state", { forceRefresh: true });

    expect(result).toEqual(legacyTrace);
  });
});
