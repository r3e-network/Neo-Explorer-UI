import { beforeEach, describe, expect, it, vi } from "vitest";

function mockReq({ origin = "", referer = "", headers = {} } = {}) {
  const h = { ...headers };
  if (origin) h.origin = origin;
  if (referer) h.referer = referer;
  return { headers: h };
}

function mockRes() {
  return {
    statusCode: 200,
    payload: null,
    setHeader() {},
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

describe("same-origin guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("allows same-origin explorer mutations (www.neo3scan.com)", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(mockReq({ origin: "https://www.neo3scan.com" }));
    expect(r.ok).toBe(true);
  });

  it("allows the apex neo3scan.com origin", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(mockReq({ origin: "https://neo3scan.com" }));
    expect(r.ok).toBe(true);
  });

  it("allows this project's own Vercel preview domain (neo-explorer-ui-<hash>-<team>.vercel.app)", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://neo-explorer-ui-abc123-jimmys-team.vercel.app" })
    );
    expect(r.ok).toBe(true);
  });

  it("allows the neo-explorer-ui.vercel.app production preview alias", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://neo-explorer-ui.vercel.app" })
    );
    expect(r.ok).toBe(true);
  });

  it("REJECTS a foreign attacker.vercel.app host (CSRF fence no longer allowlists all of *.vercel.app)", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(mockReq({ origin: "https://attacker.vercel.app" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/disallowed origin host/);
  });

  it("REJECTS a foreign someone-else-xyz.vercel.app host", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://someone-else-xyz.vercel.app" })
    );
    expect(r.ok).toBe(false);
  });

  it("REJECTS a host that only prefixes the project slug (neo-explorer-ui.evil.vercel.app)", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://neo-explorer-ui.evil.vercel.app" })
    );
    expect(r.ok).toBe(false);
  });

  it("allows the current deployment host injected via VERCEL_URL", async () => {
    vi.stubEnv("VERCEL_URL", "neo-explorer-ui-deploy77-team.vercel.app");
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://neo-explorer-ui-deploy77-team.vercel.app" })
    );
    expect(r.ok).toBe(true);
  });

  it("allows the current deployment host injected via VERCEL_URL even with a scheme prefix", async () => {
    vi.stubEnv("VERCEL_URL", "https://custom-alias.vercel.app");
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://custom-alias.vercel.app" })
    );
    expect(r.ok).toBe(true);
  });

  it("falls back to Referer when Origin is absent and allows explorer host", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(
      mockReq({ referer: "https://www.neo3scan.com/tools/multisig" })
    );
    expect(r.ok).toBe(true);
  });

  it("REJECTS a cross-origin mutation from an attacker site (CSRF block)", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(mockReq({ origin: "https://evil.example.com" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/disallowed origin host/);
  });

  it("rejects a spoofed origin that only string-contains an allowed host", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    // host is evil neo3scan.com.attacker.io, must NOT match substring
    const r = requireMutationFromExplorerOrigin(
      mockReq({ origin: "https://www.neo3scan.com.evil.attacker.io" })
    );
    expect(r.ok).toBe(false);
  });

  it("allows requests with no Origin/Referer (non-browser callers) by default", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(mockReq({}));
    expect(r.ok).toBe(true);
  });

  it("can be configured to reject no-origin requests", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const r = requireMutationFromExplorerOrigin(mockReq({}), { allowNoOrigin: false });
    expect(r.ok).toBe(false);
  });

  it("honors MULTISIG_ALLOWED_ORIGIN_HOSTS override", async () => {
    vi.stubEnv("MULTISIG_ALLOWED_ORIGIN_HOSTS", "custom.example.org,other.example.org");
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    expect(requireMutationFromExplorerOrigin(mockReq({ origin: "https://custom.example.org" })).ok).toBe(true);
    // when the override is set, the default hosts are NOT in the allowlist
    expect(requireMutationFromExplorerOrigin(mockReq({ origin: "https://www.neo3scan.com" })).ok).toBe(false);
    // an explicit override also disables the implicit project-preview matching:
    // the operator gets exactly what they pinned, nothing wider.
    expect(
      requireMutationFromExplorerOrigin(
        mockReq({ origin: "https://neo-explorer-ui-abc123-team.vercel.app" })
      ).ok
    ).toBe(false);
  });

  it("still rejects a plain non-vercel attacker host (evil.com)", async () => {
    const { requireMutationFromExplorerOrigin } = await import("../../api/lib/sameOriginGuard.js");
    expect(requireMutationFromExplorerOrigin(mockReq({ origin: "https://evil.com" })).ok).toBe(false);
  });

  it("enforceMutationSameOrigin writes 403 on cross-origin and returns false", async () => {
    const { enforceMutationSameOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const req = mockReq({ origin: "https://evil.example.com" });
    const res = mockRes();
    const ok = enforceMutationSameOrigin(req, res);
    expect(ok).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.payload).toMatchObject({ error: expect.any(String) });
  });

  it("enforceMutationSameOrigin returns true and does not write for same-origin", async () => {
    const { enforceMutationSameOrigin } = await import("../../api/lib/sameOriginGuard.js");
    const req = mockReq({ origin: "https://www.neo3scan.com" });
    const res = mockRes();
    const ok = enforceMutationSameOrigin(req, res);
    expect(ok).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe(null);
  });
});
