import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createMockRes() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = String(value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

describe("multisig mutation policy", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    const { resetSimpleRateLimitForTests } = await import("../../api/lib/simpleRateLimit.js");
    resetSimpleRateLimitForTests();
  });

  it("disables frontend-owned multisig mutations by default", async () => {
    const { enforceMultisigMutationPolicy } = await import("../../api/lib/multisigMutations.js");
    const res = createMockRes();
    const allowed = enforceMultisigMutationPolicy({
      method: "POST",
      headers: {},
      socket: { remoteAddress: "203.0.113.30" },
      body: { request_id: 1 },
    }, res, { operation: "add-signature", key: "1:NSigner" });

    expect(allowed).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.payload?.error).toContain("disabled");
  });

  it("rejects oversized multisig mutation bodies before rate limiting", async () => {
    vi.stubEnv("ENABLE_FRONTEND_MULTISIG_MUTATIONS", "true");
    const { enforceMultisigMutationPolicy } = await import("../../api/lib/multisigMutations.js");
    const res = createMockRes();
    const allowed = enforceMultisigMutationPolicy({
      method: "POST",
      headers: {},
      socket: { remoteAddress: "203.0.113.31" },
      body: { payload: "x".repeat(256) },
    }, res, { operation: "create-request", key: "test", maxBodyBytes: 64 });

    expect(allowed).toBe(false);
    expect(res.statusCode).toBe(413);
  });

  it("routes every multisig write through the shared mutation policy", () => {
    const files = [
      "api/multisig/requests.js",
      "api/multisig/requests/[id].js",
      "api/multisig/signatures.js",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source).toContain("enforceMultisigMutationPolicy");
    }
  });
});
