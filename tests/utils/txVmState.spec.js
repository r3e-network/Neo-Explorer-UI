import { describe, expect, it } from "vitest";
import { extractVmStateFromAppLog, extractVmStateFromObject, normalizeVmState } from "../../src/utils/txVmState";

describe("txVmState utilities", () => {
  describe("normalizeVmState", () => {
    it("normalizes success/failure variants to HALT/FAULT", () => {
      expect(normalizeVmState("halt")).toBe("HALT");
      expect(normalizeVmState("HALT, BREAK")).toBe("HALT");
      expect(normalizeVmState("success")).toBe("HALT");
      expect(normalizeVmState("FAULT")).toBe("FAULT");
      expect(normalizeVmState("failed")).toBe("FAULT");
      expect(normalizeVmState("error")).toBe("FAULT");
    });

    it("returns empty state for unknown/pending values", () => {
      expect(normalizeVmState("pending")).toBe("");
      expect(normalizeVmState("unknown")).toBe("");
      expect(normalizeVmState("")).toBe("");
      expect(normalizeVmState(null)).toBe("");
      expect(normalizeVmState(undefined)).toBe("");
    });
  });

  describe("extractVmStateFromObject", () => {
    it("extracts vm state from supported field variants", () => {
      expect(extractVmStateFromObject({ vmstate: "FAULT" })).toBe("FAULT");
      expect(extractVmStateFromObject({ Vmstate: "FAULT" })).toBe("FAULT");
      expect(extractVmStateFromObject({ VMState: "halt" })).toBe("HALT");
      expect(extractVmStateFromObject({ vmState: "HALT, BREAK" })).toBe("HALT");
      expect(extractVmStateFromObject({ execution_state: "failed" })).toBe("FAULT");
    });
  });

  describe("extractVmStateFromAppLog", () => {
    it("supports legacy executions array shape", () => {
      expect(extractVmStateFromAppLog({ executions: [{ vmstate: "FAULT" }] })).toBe("FAULT");
    });

    it("supports flattened indexed app-log shape", () => {
      expect(extractVmStateFromAppLog({ vmstate: "FAULT" })).toBe("FAULT");
    });
  });
});

