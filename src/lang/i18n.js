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
  await ensureLocaleMessages(FALLBACK_LOCALE);
  const locale = getStoredLocale();
  await setLanguage(locale);
  return i18n;
}

export default i18n;
