import { isAbortError } from "@/utils/abortError";

describe("isAbortError", () => {
  it("detects native fetch AbortError by name", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(isAbortError(err)).toBe(true);
  });

  it("detects axios CanceledError by name", () => {
    const err = new Error("canceled");
    err.name = "CanceledError";
    expect(isAbortError(err)).toBe(true);
  });

  it("detects ERR_CANCELED code (axios cancel token style)", () => {
    expect(isAbortError({ code: "ERR_CANCELED" })).toBe(true);
  });

  it("detects ABORT_ERR code (DOMException style)", () => {
    expect(isAbortError({ code: "ABORT_ERR" })).toBe(true);
  });

  it("rejects null / undefined", () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });

  it("rejects ordinary errors", () => {
    expect(isAbortError(new Error("500"))).toBe(false);
    expect(isAbortError({ name: "TypeError" })).toBe(false);
    expect(isAbortError({ code: "ECONNRESET" })).toBe(false);
  });
});
