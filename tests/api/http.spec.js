import { describe, expect, it } from "vitest";
import { sendJson, methodNotAllowed } from "../../api/lib/http.js";

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

describe("api/lib/http sendJson", () => {
  it("writes status, JSON content type, and serialized payload on the node path", () => {
    const res = createMockRes();

    const returned = sendJson(res, 201, { ok: true, value: 7 });

    expect(returned).toBeUndefined();
    expect(res.statusCode).toBe(201);
    expect(res.headers["Content-Type"]).toBe("application/json");
    // Byte-identical to the private copies this helper replaced:
    // res.end(JSON.stringify(payload)) with no extra whitespace.
    expect(res.getBody()).toBe('{"ok":true,"value":7}');
  });

  it("applies extra headers on the node path", () => {
    const res = createMockRes();

    sendJson(res, 200, { success: true }, { "Cache-Control": "no-store" });

    expect(res.headers["Cache-Control"]).toBe("no-store");
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(res.getBody()).toBe('{"success":true}');
  });

  it("returns a web Response when no res object is provided (edge path)", async () => {
    const response = sendJson(undefined, 400, { success: false, error: "bad" }, {
      "Cache-Control": "no-store",
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ success: false, error: "bad" });
  });
});

describe("api/lib/http methodNotAllowed", () => {
  it("emits the exact 405 payload the handlers previously inlined", () => {
    const res = createMockRes();

    methodNotAllowed(res);

    expect(res.statusCode).toBe(405);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(res.getBody()).toBe('{"error":"Method not allowed"}');
  });

  it("supports the edge path too", async () => {
    const response = methodNotAllowed(undefined);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: "Method not allowed" });
  });
});
