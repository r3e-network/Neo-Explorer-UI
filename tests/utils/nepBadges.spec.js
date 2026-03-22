import { describe, it, expect } from "vitest";
import { nepBadgeClass, nepTooltip, NEP_BADGE_CLASSES } from "@/utils/nepBadges";

describe("nepBadges", () => {
  describe("nepBadgeClass", () => {
    it("returns NEP-17 class for 'NEP-17'", () => {
      expect(nepBadgeClass("NEP-17")).toBe(NEP_BADGE_CLASSES["NEP-17"]);
    });

    it("returns NEP-11 class for 'NEP-11'", () => {
      expect(nepBadgeClass("NEP-11")).toBe(NEP_BADGE_CLASSES["NEP-11"]);
    });

    it("returns default class for unknown standard", () => {
      expect(nepBadgeClass("NEP-99")).toContain("bg-gray-100");
    });

    it("handles null/undefined gracefully", () => {
      expect(nepBadgeClass(null)).toContain("bg-gray-100");
      expect(nepBadgeClass(undefined)).toContain("bg-gray-100");
    });
  });

  describe("nepTooltip", () => {
    it("returns fungible tooltip for NEP-17", () => {
      expect(nepTooltip("NEP-17")).toBe("Fungible Token Standard");
    });

    it("returns NFT tooltip for NEP-11", () => {
      expect(nepTooltip("NEP-11")).toBe("Non-Fungible Token Standard");
    });

    it("returns payable tooltip for NEP-27", () => {
      expect(nepTooltip("NEP-27")).toBe("Payable Contract Standard");
    });

    it("returns input for unknown standard", () => {
      expect(nepTooltip("NEP-99")).toBe("NEP-99");
    });
  });
});
