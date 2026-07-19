import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SourceUnavailableError } from "@/adapters/source";
import { rpcCall, rpcService } from "../../src/services/neox/rpcService";

const NET = "neox-mainnet";

const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

const lastRequestBody = () => JSON.parse(globalThis.fetch.mock.calls.at(-1)[1].body);

describe("neox rpcService", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  describe("rpcCall", () => {
    it("POSTs a full JSON-RPC envelope to the per-net proxy and returns result", async () => {
      globalThis.fetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" }));

      const result = await rpcCall("eth_gasPrice", [], { net: NET });

      expect(result).toBe("0x1");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/neox-rpc/mainnet",
        expect.objectContaining({ method: "POST" })
      );
      expect(lastRequestBody()).toEqual({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] });
    });

    it("resolves the testnet proxy path from the net id", async () => {
      globalThis.fetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x0" }));

      await rpcCall("eth_blockNumber", [], { net: "neox-testnet" });

      expect(globalThis.fetch).toHaveBeenCalledWith("/neox-rpc/testnet", expect.anything());
    });

    it("propagates a JSON-RPC error member as a thrown Error", async () => {
      globalThis.fetch.mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 1, error: { code: 3, message: "execution reverted" } })
      );

      await expect(rpcCall("eth_call", [{}, "latest"], { net: NET })).rejects.toThrow("execution reverted");
    });

    it("throws SourceUnavailableError on a non-200 response", async () => {
      globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "down" }, 502));

      await expect(rpcCall("eth_blockNumber", [], { net: NET })).rejects.toBeInstanceOf(
        SourceUnavailableError
      );
    });

    it("throws SourceUnavailableError on a network failure", async () => {
      globalThis.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(rpcCall("eth_blockNumber", [], { net: NET })).rejects.toBeInstanceOf(
        SourceUnavailableError
      );
    });
  });

  describe("getTxpoolStatus", () => {
    it("parses the hex pending/queued strings into numbers", async () => {
      globalThis.fetch.mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 1, result: { pending: "0x1a", queued: "0x0" } })
      );

      expect(await rpcService.getTxpoolStatus({ net: NET })).toEqual({ pending: 26, queued: 0 });
      expect(lastRequestBody()).toEqual({ jsonrpc: "2.0", id: 1, method: "txpool_status", params: [] });
    });

    it("normalizes a malformed result to zeros", async () => {
      globalThis.fetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 1, result: null }));

      expect(await rpcService.getTxpoolStatus({ net: NET })).toEqual({ pending: 0, queued: 0 });
    });
  });

  describe("ethCall", () => {
    it("wraps the call object with the latest block tag", async () => {
      globalThis.fetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0xdead" }));

      const callObj = { to: "0x1212000000000000000000000000000000000004", data: "0x06fdde03" };
      const result = await rpcService.ethCall(callObj, { net: NET });

      expect(result).toBe("0xdead");
      expect(lastRequestBody()).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call", params: [callObj, "latest"] });
    });
  });

  describe("getRpcBlockNumber", () => {
    it("parses the hex head block number", async () => {
      globalThis.fetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x6d1b05" }));

      expect(await rpcService.getRpcBlockNumber({ net: NET })).toBe(0x6d1b05);
      expect(lastRequestBody()).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber", params: [] });
    });
  });
});
