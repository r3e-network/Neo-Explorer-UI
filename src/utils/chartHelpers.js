/**
 * Shared Chart.js helpers for dark/light mode theming.
 * Extracted from BurnFee, DailyTransaction, and FeeTrendChart views.
 */

export function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

export function getChartColors() {
  const dark = isDarkMode();
  return {
    text: dark ? "#9CA3AF" : "#6B7280",
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    tooltipBg: dark ? "#1F2937" : "#ffffff",
    tooltipTitle: dark ? "#F9FAFB" : "#111827",
    tooltipBody: dark ? "#D1D5DB" : "#4B5563",
    tooltipBorder: dark ? "#374151" : "#E5E7EB",
  };
}

export function baseTooltipConfig(colors) {
  return {
    mode: "index",
    intersect: false,
    backgroundColor: colors.tooltipBg,
    titleFontColor: colors.tooltipTitle,
    bodyFontColor: colors.tooltipBody,
    borderColor: colors.tooltipBorder,
    borderWidth: 1,
    xPadding: 12,
    yPadding: 10,
    displayColors: false,
  };
}

export function baseScalesConfig(colors, yTickCallback) {
  return {
    xAxes: [
      {
        gridLines: { display: false },
        ticks: { fontColor: colors.text, fontSize: 11, maxTicksLimit: 10 },
      },
    ],
    yAxes: [
      {
        gridLines: { color: colors.grid, drawBorder: false },
        ticks: {
          fontColor: colors.text,
          fontSize: 11,
          beginAtZero: true,
          callback: yTickCallback || ((v) => v.toFixed(4)),
        },
      },
    ],
  };
}
