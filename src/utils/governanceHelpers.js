/**
 * Shared utility functions for Governance components.
 */

/**
 * Format a date value to a locale string.
 * @param {string|Date|null} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
}

/**
 * Truncate a hash for compact display.
 * @param {string} value
 * @param {number} prefix - Characters to keep at the start.
 * @param {number} suffix - Characters to keep at the end.
 * @returns {string}
 */
export function formatCompactHash(value, prefix = 12, suffix = 8) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Unavailable";
  if (normalized.length <= prefix + suffix + 3) return normalized;
  return `${normalized.slice(0, prefix)}...${normalized.slice(-suffix)}`;
}

/**
 * Fallback handler for broken council member logo images.
 * Iterates through a list of candidate sources before falling back to NEO logo.
 * @param {Event} event - The img error event.
 * @param {string[]} sources - Ordered list of logo URL candidates.
 * @param {string} fallback - Final fallback URL.
 */
export function handleCouncilLogoError(event, sources = [], fallback = "/img/brand/neo.png") {
  const element = event?.target;
  if (!element) return;

  const currentIndex = Number.parseInt(element.dataset.logoFallbackIndex || "0", 10);
  const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
  const nextSource = sources[nextIndex] || fallback;

  element.dataset.logoFallbackIndex = String(nextIndex);
  element.src = nextSource;
}
