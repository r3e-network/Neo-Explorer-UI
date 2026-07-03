import { getTypeIcon, getTypeIconClass, getTypeBadgeClass } from "@/utils/searchPresentation";

describe("getTypeIcon", () => {
  it("returns the short icon code for each known type", () => {
    expect(getTypeIcon("block")).toBe("Bk");
    expect(getTypeIcon("transaction")).toBe("Tx");
    expect(getTypeIcon("address")).toBe("Ad");
    expect(getTypeIcon("contract")).toBe("Ct");
    expect(getTypeIcon("token")).toBe("Tk");
  });

  it("returns ? for unknown type", () => {
    expect(getTypeIcon("unknown")).toBe("?");
    expect(getTypeIcon("")).toBe("?");
    expect(getTypeIcon(null)).toBe("?");
    expect(getTypeIcon(undefined)).toBe("?");
  });
});

describe("getTypeIconClass", () => {
  it("returns the right tailwind class set for each type", () => {
    expect(getTypeIconClass("block")).toContain("bg-primary-100");
    expect(getTypeIconClass("transaction")).toContain("bg-green-100");
    expect(getTypeIconClass("address")).toContain("bg-orange-100");
    expect(getTypeIconClass("contract")).toContain("bg-purple-100");
    expect(getTypeIconClass("token")).toContain("bg-primary-100");
  });

  it("falls back to primary classes for unknown type", () => {
    expect(getTypeIconClass("xyz")).toContain("bg-primary-100");
    expect(getTypeIconClass(null)).toContain("bg-primary-100");
  });
});

describe("getTypeBadgeClass", () => {
  it("returns badge classes for each type", () => {
    expect(getTypeBadgeClass("block")).toContain("text-primary-600");
    expect(getTypeBadgeClass("transaction")).toContain("text-green-600");
    expect(getTypeBadgeClass("address")).toContain("text-orange-600");
    expect(getTypeBadgeClass("contract")).toContain("text-purple-600");
    expect(getTypeBadgeClass("token")).toContain("text-primary-600");
  });

  it("falls back to gray classes for unknown type", () => {
    expect(getTypeBadgeClass("xyz")).toBe("bg-gray-100 text-gray-600");
    expect(getTypeBadgeClass(null)).toBe("bg-gray-100 text-gray-600");
  });
});
