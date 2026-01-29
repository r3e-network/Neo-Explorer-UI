import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { formatListResponse, safeRpc } from "../../src/services/api.js";

// Mock axios
vi.mock("axios", () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

describe("formatListResponse", () => {
  it("returns empty result for null input", () => {
    const result = formatListResponse(null);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });

  it("returns empty result for undefined input", () => {
    const result = formatListResponse(undefined);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });

  it("handles array response", () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = formatListResponse(input);
    expect(result).toEqual({ result: input, totalCount: 3 });
  });

  it("handles empty array", () => {
    const result = formatListResponse([]);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });

  it("handles object with result and totalCount", () => {
    const input = {
      result: [{ id: 1 }, { id: 2 }],
      totalCount: 100,
    };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: input.result, totalCount: 100 });
  });

  it("handles object with result but no totalCount", () => {
    const input = { result: [{ id: 1 }] };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: [{ id: 1 }], totalCount: 0 });
  });

  it("handles object with non-array result", () => {
    const input = { result: "invalid", totalCount: 5 };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: [], totalCount: 5 });
  });

  it("returns empty for object without result property", () => {
    const input = { data: [1, 2, 3], count: 3 };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });
});

describe("safeRpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns result on success", async () => {
    axios.post.mockResolvedValueOnce({
      data: { result: { blockHeight: 12345 } },
    });

    const result = await safeRpc("GetBlockCount", {});
    expect(result).toEqual({ blockHeight: 12345 });
  });

  it("returns default value on error", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));

    const result = await safeRpc("GetBlockCount", {}, { blockHeight: 0 });
    expect(result).toEqual({ blockHeight: 0 });
  });

  it("returns null as default when not specified", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));

    const result = await safeRpc("GetBlockCount", {});
    expect(result).toBeNull();
  });

  it("returns default value when result is null", async () => {
    axios.post.mockResolvedValueOnce({ data: { result: null } });

    const result = await safeRpc("GetBlockCount", {}, []);
    expect(result).toEqual([]);
  });
});
