import { describe, expect, it, vi } from "vitest";

describe("Postgres TLS configuration", () => {
  it("verifies Supabase database certificates by default", async () => {
    const { buildPgSslConfig } = await import("../../api/lib/pgSsl.js");

    expect(
      buildPgSslConfig({
        rawConnectionString: "postgresql://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require",
        env: {},
      }),
    ).toEqual({ rejectUnauthorized: true });
  });

  it("requires an explicit insecure override to disable certificate verification", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { buildPgSslConfig } = await import("../../api/lib/pgSsl.js");

    expect(
      buildPgSslConfig({
        rawConnectionString: "postgresql://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require",
        env: { DB_SSL_ALLOW_INSECURE: "1" },
      }),
    ).toEqual({ rejectUnauthorized: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("DB_SSL_ALLOW_INSECURE"));

    warn.mockRestore();
  });
});
