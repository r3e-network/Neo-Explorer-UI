// Shared Age ⇄ UTC column mode for Neo X tables.
//
// Etherscan-style: clicking any table's Age header flips EVERY timestamp
// column app-wide, and the choice sticks across reloads. The mode lives in a
// single module-level ref so all tables react to one click; persistence goes
// through localStorage under a Neo X specific key.

import { ref } from "vue";
import { timeAgo } from "@/utils/neoxFormat";

export const AGE_MODE_STORAGE_KEY = "neo_explorer_x_age_mode";

const MODE_AGE = "age";
const MODE_UTC = "utc";

function getStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Storage can throw in restricted/private contexts; fall back to the
    // in-memory ref only (the toggle still works for the session).
  }
  return null;
}

function getStoredMode() {
  const stored = getStorage()?.getItem(AGE_MODE_STORAGE_KEY);
  return stored === MODE_AGE || stored === MODE_UTC ? stored : null;
}

// One ref for the whole app -- every table shares it.
const ageMode = ref(getStoredMode() || MODE_AGE);

function toggleAgeMode() {
  ageMode.value = ageMode.value === MODE_AGE ? MODE_UTC : MODE_AGE;
  try {
    getStorage()?.setItem(AGE_MODE_STORAGE_KEY, ageMode.value);
  } catch {
    // Quota/permission failures only lose persistence, never the toggle.
  }
}

const pad2 = (n) => String(n).padStart(2, "0");

/** Compact UTC string ("YYYY-MM-DD HH:mm:ss") from ms since epoch. */
function formatUtc(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const d = new Date(n);
  const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  return `${date} ${time}`;
}

/**
 * Format a timestamp according to the current mode: relative age
 * ("12s ago") or compact UTC ("2026-07-21 08:30:00").
 *
 * @param {number} ms - Timestamp in ms since epoch.
 * @param {number} [nowMs] - "Now" for age mode (e.g. a ticking useNow ref).
 * @returns {string}
 */
function formatWhen(ms, nowMs = Date.now()) {
  return ageMode.value === MODE_UTC ? formatUtc(ms) : timeAgo(ms, nowMs);
}

export function useAgeMode() {
  return { ageMode, toggleAgeMode, formatWhen };
}
