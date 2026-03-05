import { describe, expect, it } from "vitest";

import { extractFailureReasonFromAppLog } from "@/utils/txFailureReason";

describe("txFailureReason", () => {
  it("extracts first execution exception when vmstate is FAULT", () => {
    const reason = extractFailureReasonFromAppLog({
      executions: [
        { vmstate: "HALT", exception: "" },
        { vmstate: "FAULT", exception: "ECORE-22: transfer failed" },
      ],
    });

    expect(reason).toBe("ECORE-22: transfer failed");
  });

  it("falls back to top-level exception", () => {
    const reason = extractFailureReasonFromAppLog({
      vmstate: "FAULT",
      exception: "Top-level exception text",
    });

    expect(reason).toBe("Top-level exception text");
  });

  it("returns empty string when no exception is available", () => {
    const reason = extractFailureReasonFromAppLog({
      executions: [{ vmstate: "FAULT", notifications: [] }],
    });

    expect(reason).toBe("");
  });
});
