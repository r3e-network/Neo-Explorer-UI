import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDarkMode, getChartColors, baseTooltipConfig, baseScalesConfig } from "../../src/utils/chartHelpers.js";

describe("chartHelpers", () => {
  let originalClassList;

  beforeEach(() => {
    // Save original classList state
    originalClassList = [...document.documentElement.classList];
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    // Restore original classList
    document.documentElement.className = "";
    originalClassList.forEach((cls) => document.documentElement.classList.add(cls));
  });

  describe("isDarkMode", () => {
    it("returns false when dark class is absent", () => {
      expect(isDarkMode()).toBe(false);
    });

    it("returns true when dark class is present", () => {
      document.documentElement.classList.add("dark");
      expect(isDarkMode()).toBe(true);
    });
  });

  describe("getChartColors", () => {
    it("returns light mode colors by default", () => {
      const colors = getChartColors();
      expect(colors.text).toBe("#6B7280");
      expect(colors.grid).toBe("rgba(0,0,0,0.05)");
      expect(colors.tooltipBg).toBe("#ffffff");
      expect(colors.tooltipTitle).toBe("#111827");
      expect(colors.tooltipBody).toBe("#4B5563");
      expect(colors.tooltipBorder).toBe("#E5E7EB");
    });

    it("returns dark mode colors when dark class is present", () => {
      document.documentElement.classList.add("dark");
      const colors = getChartColors();
      expect(colors.text).toBe("#9CA3AF");
      expect(colors.grid).toBe("rgba(255,255,255,0.08)");
      expect(colors.tooltipBg).toBe("#1F2937");
      expect(colors.tooltipTitle).toBe("#F9FAFB");
      expect(colors.tooltipBody).toBe("#D1D5DB");
      expect(colors.tooltipBorder).toBe("#374151");
    });
  });

  describe("baseTooltipConfig", () => {
    it("builds tooltip config from colors", () => {
      const colors = {
        tooltipBg: "#fff",
        tooltipTitle: "#000",
        tooltipBody: "#333",
        tooltipBorder: "#ccc",
      };
      const config = baseTooltipConfig(colors);

      expect(config).toEqual({
        mode: "index",
        intersect: false,
        backgroundColor: "#fff",
        titleFontColor: "#000",
        bodyFontColor: "#333",
        borderColor: "#ccc",
        borderWidth: 1,
        xPadding: 12,
        yPadding: 10,
        displayColors: false,
      });
    });
  });

  describe("baseScalesConfig", () => {
    it("builds scales config with default tick callback", () => {
      const colors = { text: "#aaa", grid: "#eee" };
      const config = baseScalesConfig(colors);

      expect(config.xAxes).toHaveLength(1);
      expect(config.xAxes[0].gridLines.display).toBe(false);
      expect(config.xAxes[0].ticks.fontColor).toBe("#aaa");

      expect(config.yAxes).toHaveLength(1);
      expect(config.yAxes[0].gridLines.color).toBe("#eee");
      expect(config.yAxes[0].ticks.beginAtZero).toBe(true);
      // Default callback: toFixed(4)
      expect(config.yAxes[0].ticks.callback(1.23456789)).toBe("1.2346");
    });

    it("uses custom yTickCallback when provided", () => {
      const colors = { text: "#aaa", grid: "#eee" };
      const customCb = (v) => `${v}%`;
      const config = baseScalesConfig(colors, customCb);

      expect(config.yAxes[0].ticks.callback(42)).toBe("42%");
    });
  });
});
