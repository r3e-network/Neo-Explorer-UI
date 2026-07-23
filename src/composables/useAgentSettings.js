// Bring-your-own-key (BYOK) settings for the Neo assistant.
//
// A user can run the assistant on THEIR OWN LLM account instead of this site's
// shared hosted key. This composable owns the browser-side preferences and the
// (never-server-stored) BYOK credential; the request seam (providers.js) and
// the settings panel read/write through it.
//
// Mirrors the useTheme.js pattern: one set of module-level refs shared by every
// caller (singleton), and every storage access wrapped in try/catch so a
// private/restricted browsing context degrades to in-memory-only rather than
// throwing. Preferences persist synchronously inside the setters (as
// useTheme's toggleTheme does) — there is no reactive side-effect to watch.
//
// Storage layout:
//   localStorage  neo_explorer_agent_settings  -> {mode, model, baseUrl, rememberKey}
//   sessionStorage neo_explorer_agent_byok_key -> the API key (default; per-tab)
//   localStorage   neo_explorer_agent_byok_key -> the API key, ONLY while
//                                                 rememberKey is true (mirror)
// The key defaults to sessionStorage (cleared on tab close). It is mirrored to
// localStorage only when the user opts into "remember on this device", and
// clearKey()/setRememberKey(false) purge it from BOTH stores.

import { ref, computed } from "vue";

/**
 * The only base URLs the BYOK path may target. The server enforces the same
 * allowlist (SSRF guard); this is the client-side mirror so the panel can only
 * ever offer / persist a safe value. Both are Anthropic-Messages compatible.
 */
export const ALLOWED_BASE_URLS = ["https://api.deepseek.com/anthropic", "https://api.anthropic.com"];

export const AGENT_SETTINGS_STORAGE_KEY = "neo_explorer_agent_settings";
export const AGENT_BYOK_KEY_STORAGE_KEY = "neo_explorer_agent_byok_key";

const VALID_MODES = ["hosted", "byok"];
const DEFAULT_MODE = "hosted";

function getLocalStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Storage access itself can throw in restricted/private contexts.
  }
  return null;
}

function getSessionStorage() {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    // Storage access itself can throw in restricted/private contexts.
  }
  return null;
}

function safeGet(storage, key) {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Quota/permission failures only lose persistence, never in-memory state.
  }
}

function safeRemove(storage, key) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Removal can fail in restricted contexts; nothing else to do.
  }
}

function sanitizeMode(value) {
  return VALID_MODES.includes(value) ? value : DEFAULT_MODE;
}

function sanitizeModel(value) {
  return typeof value === "string" ? value : "";
}

function sanitizeBaseUrl(value) {
  return value === "" || ALLOWED_BASE_URLS.includes(value) ? value : "";
}

function readStoredPrefs() {
  const raw = safeGet(getLocalStorage(), AGENT_SETTINGS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// On load, prefer the remembered (localStorage) key, then the per-tab
// (sessionStorage) one; a missing/blank value means "no BYOK key".
function readStoredKey() {
  const fromLocal = safeGet(getLocalStorage(), AGENT_BYOK_KEY_STORAGE_KEY);
  if (typeof fromLocal === "string" && fromLocal) return fromLocal;
  const fromSession = safeGet(getSessionStorage(), AGENT_BYOK_KEY_STORAGE_KEY);
  if (typeof fromSession === "string" && fromSession) return fromSession;
  return "";
}

const storedPrefs = readStoredPrefs();

// Singleton module-level state -- every useAgentSettings() call shares these.
const mode = ref(sanitizeMode(storedPrefs.mode));
const model = ref(sanitizeModel(storedPrefs.model));
const baseUrl = ref(sanitizeBaseUrl(storedPrefs.baseUrl));
const rememberKey = ref(storedPrefs.rememberKey === true);
const apiKey = ref(readStoredKey());

const isByokReady = computed(() => mode.value === "byok" && apiKey.value.trim() !== "");
// An empty/whitespace BYOK key falls back to hosted so the assistant is never
// left in a broken "byok but unusable" state.
const activeMode = computed(() => (isByokReady.value ? "byok" : "hosted"));

function persistPrefs() {
  safeSet(
    getLocalStorage(),
    AGENT_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      mode: mode.value,
      model: model.value,
      baseUrl: baseUrl.value,
      rememberKey: rememberKey.value,
    }),
  );
}

function removeKeyFromBothStores() {
  safeRemove(getLocalStorage(), AGENT_BYOK_KEY_STORAGE_KEY);
  safeRemove(getSessionStorage(), AGENT_BYOK_KEY_STORAGE_KEY);
}

// The key always lives in sessionStorage for the active tab; it is additionally
// mirrored to localStorage only while rememberKey is true. A blank key is never
// written -- it is purged instead.
function persistKey() {
  if (!apiKey.value) {
    removeKeyFromBothStores();
    return;
  }
  safeSet(getSessionStorage(), AGENT_BYOK_KEY_STORAGE_KEY, apiKey.value);
  if (rememberKey.value) {
    safeSet(getLocalStorage(), AGENT_BYOK_KEY_STORAGE_KEY, apiKey.value);
  } else {
    safeRemove(getLocalStorage(), AGENT_BYOK_KEY_STORAGE_KEY);
  }
}

function setMode(next) {
  // Ignore anything off the valid set rather than silently flipping to the
  // default -- callers only ever pass 'hosted' | 'byok'.
  if (!VALID_MODES.includes(next)) return;
  mode.value = next;
  persistPrefs();
}

function setModel(next) {
  model.value = sanitizeModel(next);
  persistPrefs();
}

function setBaseUrl(next) {
  // Coerce anything off the allowlist back to the default ("") so a
  // non-allowlisted URL can never be persisted or handed to the request seam.
  baseUrl.value = sanitizeBaseUrl(next);
  persistPrefs();
}

function setApiKey(next) {
  apiKey.value = typeof next === "string" ? next : "";
  persistKey();
}

function setRememberKey(next) {
  rememberKey.value = next === true;
  persistPrefs();
  if (rememberKey.value) {
    // Opting in mirrors the current key onto this device.
    persistKey();
  } else {
    // Opting out forgets the key everywhere; the in-memory value stays usable
    // for the current session but nothing is persisted.
    removeKeyFromBothStores();
  }
}

function clearKey() {
  apiKey.value = "";
  removeKeyFromBothStores();
}

export function useAgentSettings() {
  return {
    mode,
    model,
    baseUrl,
    apiKey,
    rememberKey,
    isByokReady,
    activeMode,
    setMode,
    setModel,
    setBaseUrl,
    setApiKey,
    setRememberKey,
    clearKey,
  };
}

export default useAgentSettings;
