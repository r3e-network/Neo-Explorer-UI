import { describe, expect, it, vi } from "vitest";
import { executionService } from "../../src/services/executionService.js";

describe("Execution Service Fallback Parser", () => {
  it("should successfully parse a legacy application log into an enriched trace without throwing", async () => {
    const appLog = {
      txid: "0x9f58e789c3e6460c81f49b58655648c98d54dd08235c4b00c50ca7e67cdf9cc0",
      executions: [
        {
          trigger: "Application",
          vmstate: "HALT",
          gasconsumed: "1234567",
          stack: [],
          notifications: [
            {
              contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
              eventname: "Transfer",
              state: { type: "Array", value: [] },
            },
          ],
        },
      ],
    };
    
    // Mock the backend fetches to return our static payload
    vi.spyOn(executionService, "_getExecutionTraceIndexed").mockResolvedValue(null);
    vi.spyOn(executionService, "_getExecutionTraceLegacy").mockResolvedValue(appLog);
    vi.spyOn(executionService, "getDetailedTrace").mockResolvedValue(null);
    vi.spyOn(executionService, "_fetchManifests").mockResolvedValue({
      manifests: new Map([
        ["0xd2a4cff31913016155e38e474a2c06d08be276cf", null],
      ]),
      failures: [],
    });
    
    const enriched = await executionService.getEnrichedTrace("0x9f58e789c3e6460c81f49b58655648c98d54dd08235c4b00c50ca7e67cdf9cc0");
    expect(enriched).toBeDefined();
    expect(enriched.executions.length).toBeGreaterThan(0);
    expect(enriched.executions[0].operations.length).toBeGreaterThan(0);
  });
});
