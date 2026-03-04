import { describe, expect, it, vi } from "vitest";
import { executionService } from "../../src/services/executionService.js";
import fs from "fs";
import path from "path";

describe("Execution Service Fallback Parser", () => {
  it("should successfully parse a legacy application log into an enriched trace without throwing", async () => {
    const rawData = fs.readFileSync(path.resolve(process.cwd(), "raw_applog.json"), "utf8");
    const appLog = JSON.parse(rawData);
    
    // Mock the backend fetches to return our static payload
    vi.spyOn(executionService, "_getExecutionTraceIndexed").mockResolvedValue(null);
    vi.spyOn(executionService, "_getExecutionTraceLegacy").mockResolvedValue(appLog);
    vi.spyOn(executionService, "getDetailedTrace").mockResolvedValue(null);
    
    const enriched = await executionService.getEnrichedTrace("0x9f58e789c3e6460c81f49b58655648c98d54dd08235c4b00c50ca7e67cdf9cc0");
    expect(enriched).toBeDefined();
    expect(enriched.executions.length).toBeGreaterThan(0);
    expect(enriched.executions[0].operations.length).toBeGreaterThan(0);
  });
});
