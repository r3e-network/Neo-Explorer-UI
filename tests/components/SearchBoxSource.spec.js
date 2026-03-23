import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/components/common/SearchBox.vue"), "utf8");

describe("SearchBox source", () => {
  it("avoids importing the heavyweight explorerFormat barrel", () => {
    expect(source).not.toContain('from "@/utils/explorerFormat"');
    expect(source).toContain('from "@/utils/addressFormat"');
    expect(source).toContain('from "@/utils/searchPresentation"');
  });
});
