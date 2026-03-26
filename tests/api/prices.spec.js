import { beforeEach, describe, expect, it, vi } from "vitest";

function createMockRes() {
  const headers = {};
  let body = "";

  return {
    headers,
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = value;
    },
    end(chunk = "") {
      body += chunk;
    },
    getBody() {
      return body;
    },
  };
}

describe("api/prices", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("returns same-origin price JSON from the CoinGecko upstream", async () => {
    const payload = {
      neo: { usd: 2.68, usd_24h_change: 1.6 },
      gas: { usd: 1.53, usd_24h_change: 0.17 },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const handler = (await import("../../api/prices.js")).default || (await import("../../api/prices.js"));
    const res = createMockRes();

    await handler({ method: "GET" }, res);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.coingecko.com/api/v3/simple/price?ids=neo,gas&vs_currencies=usd&include_24hr_change=true",
      expect.any(Object),
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(res.headers["Cache-Control"]).toBe("s-maxage=60, stale-while-revalidate=300");
    expect(JSON.parse(res.getBody())).toEqual(payload);
  });

  it("returns a JSON error instead of hanging when the upstream fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("upstream timeout"));
    vi.stubGlobal("fetch", fetchMock);

    const handler = (await import("../../api/prices.js")).default || (await import("../../api/prices.js"));
    const res = createMockRes();

    await handler({ method: "GET" }, res);

    expect(res.statusCode).toBe(502);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(res.getBody())).toEqual({
      error: "Price fetch failed",
    });
  });
});
