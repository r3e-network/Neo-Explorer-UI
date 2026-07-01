import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "@/utils/clipboard";

describe("copyTextToClipboard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.execCommand = vi.fn().mockReturnValue(true);
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
  });

  it("writes through the modern clipboard API", async () => {
    await expect(copyTextToClipboard("0xabc")).resolves.toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("0xabc");
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  it("falls back to selection copy when the modern API fails", async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("denied"));

    await expect(copyTextToClipboard("fallback-value")).resolves.toBe(true);

    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("returns false for empty input", async () => {
    await expect(copyTextToClipboard("")).resolves.toBe(false);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
