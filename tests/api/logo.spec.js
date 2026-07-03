import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const handlerPath = path.resolve(process.cwd(), "api/logo.js");
const publicImageUrl = "https://93.184.216.34/logo.png";

function loadHandler() {
  delete require.cache[require.resolve("../../api/logo.js")];
  return require("../../api/logo.js");
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
    redirect(code, location) {
      this.statusCode = code;
      this.headers.location = location;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

describe("logo API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("does not hard-require sharp during module load", () => {
    const source = fs.readFileSync(handlerPath, "utf8");

    expect(source).not.toMatch(/const\s+sharp\s*=\s*require\(["']sharp["']\)/);
  });

  it("streams the original image when the sharp optimizer is unavailable", async () => {
    const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    globalThis.fetch = vi.fn(async () => {
      return new Response(imageBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(imageBytes.length),
        },
      });
    });

    const handler = loadHandler();
    handler._internal.setSharpLoaderForTests(() => null);

    const res = createResponse();
    await handler({ method: "GET", query: { u: publicImageUrl, w: "72", q: "72" }, headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.body).toEqual(imageBytes);
  });

  it("supports HEAD probes without invoking the optimizer", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(null, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": "1234",
        },
      });
    });

    const handler = loadHandler();
    handler._internal.setSharpLoaderForTests(() => {
      throw new Error("sharp should not be loaded for HEAD");
    });

    const res = createResponse();
    await handler({ method: "HEAD", query: { u: publicImageUrl }, headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.body).toBe(null);
    expect(res.ended).toBe(true);
  });
});
