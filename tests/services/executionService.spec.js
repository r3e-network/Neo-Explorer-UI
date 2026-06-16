import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../src/services/api.js";

const callWithRpcEndpointFallback = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

vi.mock("@/utils/rpcEndpoints", () => ({
  callWithRpcEndpointFallback,
  toNetworkMode: vi.fn((env) => env),
}));

vi.mock("@/utils/neonLoader.js", () => ({
  loadNeonJs: vi.fn(async () => ({
    rpc: {
      RPCClient: class {
        constructor(endpoint) {
          this.endpoint = endpoint;
        }

        async getApplicationLog(hash) {
          return { hash };
        }
      },
    },
  })),
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: vi.fn(() => "Mainnet"),
  toAbsoluteUrl: vi.fn((endpoint) => endpoint),
}));

import { executionService } from "../../src/services/executionService.js";

describe("executionService getExecutionTrace fallback behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callWithRpcEndpointFallback.mockReset();
    api.rpc.mockReset();
    api.safeRpc.mockReset();
    api.safeRpcList.mockReset();
  });

  it("uses native getapplicationlog when notifications are present", async () => {
    const indexedTrace = {
      executions: [{ vmstate: "HALT", notifications: [{ eventname: "Transfer" }] }],
    };

    callWithRpcEndpointFallback.mockResolvedValueOnce(indexedTrace);

    const result = await executionService.getExecutionTrace("0xtx-indexed", { forceRefresh: true });

    expect(result).toEqual(indexedTrace);
    expect(callWithRpcEndpointFallback).toHaveBeenCalledTimes(1);
    expect(api.safeRpc).not.toHaveBeenCalled();
  });

  it("falls back to safe standard getapplicationlog when native endpoint is unavailable", async () => {
    const fallbackTrace = {
      executions: [{ vmstate: "HALT", notifications: [{ eventname: "UserWithdrew" }] }],
    };

    callWithRpcEndpointFallback.mockRejectedValueOnce(new Error("direct rpc down"));
    api.safeRpc.mockImplementation(async (method) => {
      if (method === "getapplicationlog") return fallbackTrace;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-fallback", { forceRefresh: true });

    expect(result).toEqual(fallbackTrace);
    expect(api.safeRpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-fallback"], null, expect.any(Object));
    expect(api.safeRpc).not.toHaveBeenCalledWith("getapplicationlog", ["0xtx-indexed"], null, expect.any(Object));
    expect(api.safeRpc).not.toHaveBeenCalledWith(
      "GetApplicationLogByTransactionHash",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("uses safe standard result when native trace is unavailable", async () => {
    const standardTrace = {
      executions: [{ vmstate: "FAULT", notifications: [{ eventname: "Transfer" }] }],
    };

    callWithRpcEndpointFallback.mockResolvedValueOnce(null);
    api.safeRpc.mockImplementation(async (method) => {
      if (method === "getapplicationlog") return standardTrace;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-standard", { forceRefresh: true });

    expect(result).toEqual(standardTrace);
    expect(api.safeRpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-standard"], null, expect.any(Object));
  });

  it("normalizes flattened native trace shape into executions array", async () => {
    const indexedTrace = {
      txid: "0xtx-flat",
      trigger: "Application",
      vmstate: "FAULT",
      gasconsumed: "1000",
      notifications: [],
      stack: [],
    };

    callWithRpcEndpointFallback.mockResolvedValueOnce(indexedTrace);

    const result = await executionService.getExecutionTrace("0xtx-flat", { forceRefresh: true });

    expect(result.executions?.[0]?.vmstate).toBe("FAULT");
    expect(result.executions?.[0]?.trigger).toBe("Application");
  });

  it("keeps native trace when neither candidate has notifications", async () => {
    const nativeTrace = {
      txid: "0xtx-missing-state",
      trigger: "Application",
      notifications: [],
      stack: [],
    };
    const safeStandardTrace = {
      executions: [{ vmstate: "FAULT", notifications: [] }],
    };

    callWithRpcEndpointFallback.mockResolvedValueOnce(nativeTrace);
    api.safeRpc.mockImplementation(async (method) => {
      if (method === "getapplicationlog") return safeStandardTrace;
      return null;
    });

    const result = await executionService.getExecutionTrace("0xtx-missing-state", { forceRefresh: true });

    expect(result).toEqual({
      ...nativeTrace,
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
  });
});
