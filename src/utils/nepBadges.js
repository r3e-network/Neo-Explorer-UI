const NEP_BADGE_DEFAULT =
  "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";

export const NEP_BADGE_CLASSES = Object.freeze({
  "NEP-17":
    "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  NEP17: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "NEP-11":
    "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  NEP11:
    "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  "NEP-27":
    "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  NEP27:
    "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
});

export function nepBadgeClass(std) {
  return NEP_BADGE_CLASSES[String(std || "").toUpperCase()] || NEP_BADGE_DEFAULT;
}

// Same global-singleton pattern as formatAge: resolve through vue-i18n when
// available, fall back to English otherwise (test/SSR safety).
function tNep(key, fallback) {
  try {
    const i18n = globalThis.__neoExplorerI18n__;
    if (!i18n) return fallback;
    const out = i18n.global.t(key);
    return out === key ? fallback : out;
  } catch {
    return fallback;
  }
}

export function nepTooltip(std) {
  const upper = String(std || "").toUpperCase();
  if (upper.includes("NEP-17") || upper.includes("NEP17"))
    return tNep("nepBadges.nep17", "Fungible Token Standard");
  if (upper.includes("NEP-11") || upper.includes("NEP11"))
    return tNep("nepBadges.nep11", "Non-Fungible Token Standard");
  if (upper.includes("NEP-27") || upper.includes("NEP27"))
    return tNep("nepBadges.nep27", "Payable Contract Standard");
  return std;
}
