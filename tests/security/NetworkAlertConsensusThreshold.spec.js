import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "api/check_alerts.js"), "utf8");

describe("consensus missed alert thresholding", () => {
  it("uses the configured threshold and only triggers when a miss streak crosses it", () => {
    expect(source).toMatch(/const missThreshold = Math\.max\(1, Number\(alert\.threshold\) \|\| 3\)/);
    expect(source).toMatch(/currentMissCount >= missThreshold && previousMissCount < missThreshold/);
    expect(source).not.toMatch(/currentMissCount >= 3\)/);
  });
});
