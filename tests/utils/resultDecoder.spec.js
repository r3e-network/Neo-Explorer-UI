import { describe, expect, it } from "vitest";
import { decodeStackItem } from "@/utils/resultDecoder";

describe("resultDecoder.decodeStackItem", () => {
  it("decodes non-ascii utf-8 ByteStrings as readable text", () => {
    const decoded = decodeStackItem({
      type: "ByteString",
      value: btoa(unescape(encodeURIComponent("NEXT（NeoLine）"))),
    });

    expect(decoded.type).toBe("String");
    expect(decoded.value).toBe("NEXT（NeoLine）");
  });

  it("keeps binary ByteStrings as hex", () => {
    const decoded = decodeStackItem({
      type: "ByteString",
      value: btoa(String.fromCharCode(0, 1, 2, 255)),
    });

    expect(decoded.type).toBe("Hex");
    expect(decoded.value).toBe("000102ff");
  });
});
