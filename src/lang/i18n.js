import { createI18n } from "vue-i18n";

const DEFAULT_LOCALE = "en";
const FALLBACK_LOCALE = "en";
const SUPPORTED_LOCALES = ["cn", "en", "fr", "ja", "ko"];

const localeLoaders = import.meta.glob("./*.js");
const loadedLocales = new Set();

function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

function getStoredLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(localStorage.getItem("lang") || DEFAULT_LOCALE);
}

function getLocaleModulePath(locale) {
  if (locale === "cn") return "./zh_cn.js";
  return `./${locale}.js`;
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  messages: {},
});

// Expose the i18n singleton on globalThis so utility modules (timeFormat,
// etc.) can resolve translations without forcing every caller to pipe `t`
// through. SSR/test environments without vue-i18n simply skip the lookup
// and fall back to English in the helper.
if (typeof globalThis !== "undefined") {
  globalThis.__neoExplorerI18n__ = i18n;
}

export async function ensureLocaleMessages(locale) {
  const normalized = normalizeLocale(locale);
  if (loadedLocales.has(normalized)) {
    return normalized;
  }

  const modulePath = getLocaleModulePath(normalized);
  const loader = localeLoaders[modulePath];
  if (!loader) {
    throw new Error(`Locale loader not found for ${normalized}`);
  }

  const mod = await loader();
  i18n.global.setLocaleMessage(normalized, mod.default);
  loadedLocales.add(normalized);
  return normalized;
}

export async function setLanguage(locale) {
  const normalized = normalizeLocale(locale);
  await ensureLocaleMessages(normalized);
  i18n.global.locale.value = normalized;
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", normalized);
  }
  return normalized;
}

export async function initializeI18n() {
  // The fallback locale is the minimum needed to render the app. If even this
  // fails (e.g. a purged chunk immediately after a deploy) we let it throw so
  // the bootstrap can attempt a one-time reload recovery.
  await ensureLocaleMessages(FALLBACK_LOCALE);

  // The user's preferred locale is best-effort: a failed dynamic import here
  // must NOT white-screen the whole app. Fall back to the already-loaded
  // fallback locale so the UI still mounts (in English).
  const locale = getStoredLocale();
  try {
    await setLanguage(locale);
  } catch (err) {
    if (typeof console !== "undefined") {
      console.error(`[i18n] failed to load locale "${locale}", falling back to "${FALLBACK_LOCALE}":`, err);
    }
    try {
      i18n.global.locale.value = FALLBACK_LOCALE;
      if (typeof document !== "undefined") {
        document.documentElement.lang = FALLBACK_LOCALE;
      }
    } catch {
      // best-effort; fallback messages are already loaded above
    }
  }
  return i18n;
}

export default i18n;
