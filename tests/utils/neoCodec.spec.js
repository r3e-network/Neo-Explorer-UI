import { describe, expect, it } from "vitest";
import { decodeStackItem } from "@/utils/neoCodec";

describe("neoCodec.decodeStackItem", () => {
  it("treats ByteString hash text as Hash160", () => {
    const decoded = decodeStackItem({
      type: "ByteString",
      value: btoa("0x017520f068fd602082fe5572596185e62a4ad991"),
    });

    expect(decoded.type).toBe("Hash160");
    expect(decoded.decodedValue).toBe("0x017520f068fd602082fe5572596185e62a4ad991");
    expect(decoded.displayValue).toBe("0x017520f068fd602082fe5572596185e62a4ad991");
  });
});
