import { afterEach, describe, expect, it } from "vitest";

import {
  __resetWebVitalsForTests,
  getRecentWebVitals,
  recordWebVital,
} from "../../src/telemetry/webVitals.js";

describe("webVitals telemetry", () => {
  afterEach(() => {
    __resetWebVitalsForTests();
  });

  it("records web vital metrics with ratings and exposes them on window", () => {
    recordWebVital({ name: "LCP", value: 1800, route: "/" });
    recordWebVital({ name: "CLS", value: 0.2, route: "/blocks" });
    recordWebVital({ name: "INP", value: 650, route: "/tx" });

    expect(getRecentWebVitals()).toEqual([
      expect.objectContaining({ name: "LCP", value: 1800, rating: "good", route: "/" }),
      expect.objectContaining({ name: "CLS", value: 0.2, rating: "needs-improvement", route: "/blocks" }),
      expect.objectContaining({ name: "INP", value: 650, rating: "poor", route: "/tx" }),
    ]);
    expect(window.__NEO_EXPLORER_WEB_VITALS__).toHaveLength(3);
  });

  it("keeps the recent web vitals window bounded", () => {
    for (let index = 0; index < 45; index += 1) {
      recordWebVital({ name: "LONG_TASK", value: index + 1, route: "/" });
    }

    const rows = getRecentWebVitals();
    expect(rows).toHaveLength(40);
    expect(rows[0].value).toBe(6);
    expect(rows[39].value).toBe(45);
  });
});
