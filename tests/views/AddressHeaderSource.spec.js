// @vitest-environment node

import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("AddressHeader source guards", () => {
  it("allows long public tags to wrap inside the mobile viewport", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/components/AddressHeader.vue", import.meta.url), "utf8");

    expect(source).toContain("inline-flex min-w-0 max-w-full");
    expect(source).toContain("break-all rounded-lg bg-teal-100");
  });
});
