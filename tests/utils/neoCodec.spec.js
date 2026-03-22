import { describe, expect, it } from "vitest";
import { decodeNotificationParams, decodeStackItem } from "@/utils/neoCodec";

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

  it("keeps ABI-declared ByteString params as text even when they are 20 bytes long", () => {
    const pair = "TWELVEDATA:PAIR-0001";
    const decoded = decodeNotificationParams(
      {
        type: "Array",
        value: [
          {
            type: "ByteString",
            value: btoa(pair),
          },
        ],
      },
      {
        parameters: [{ name: "pair", type: "ByteString" }],
      }
    );

    expect(decoded).toHaveLength(1);
    expect(decoded[0].type).toBe("ByteString");
    expect(decoded[0].decoded.type).toBe("ByteString");
    expect(decoded[0].decoded.displayValue).toBe(pair);
  });
});
