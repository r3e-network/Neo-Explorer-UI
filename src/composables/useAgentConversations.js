// Local-first, multi-conversation library for the Neo assistant drawer.
//
// This composable is the reactive seam between the drawer UI and the durable
// conversation store (`services/agentConversationStore`). It owns exactly ONE
// store instance and one set of module-level refs shared by every caller — the
// same singleton pattern as useAgentSettings.js / useTheme.js — so the panel,
// the history list, and any other consumer all see the same live state.
//
// Invariants inherited from the store (this layer never re-implements them):
//   - Nothing signable is ever persisted. Proposals are stored only as inert
//     `{ expired: true }` markers; the store centralizes that stripping.
//   - Storage never breaks the drawer. The store degrades to an in-memory
//     backend when IndexedDB is unavailable, so every method below still works
//     (just without cross-reload persistence). `persistent` reports which case
//     we are in so the UI can warn.
//   - Local only. No network, no server; the store is origin-scoped IndexedDB
//     (or memory). This composable adds no I/O of its own beyond the store.
//
// `saveActive()` is debounced: the transcript changes on every streamed token,
// so a burst of rapid saves must coalesce into a single write of the latest
// state rather than hammering the backend. Every caller within a debounce
// window resolves together once that single write lands.

import { ref } from "vue";
import { createConversationStore } from "@/services/agentConversationStore";
import { toMarkdown } from "@/utils/agentTranscript";

// Short enough to feel instant, long enough to swallow a fast token stream.
export const SAVE_DEBOUNCE_MS = 400;

// The one store instance every caller shares. Auto-selects IndexedDB when it is
// usable, else an in-memory fallback — the store owns that decision and never
// throws, so constructing it here is safe on any origin.
const store = createConversationStore();

// Singleton module-level reactive state -- every useAgentConversations() call
// returns these same refs.
const conversations = ref([]); // listMeta() result: newest first, no full messages
const activeId = ref(null);
const persistent = ref(store.isPersistent());

// Debounce bookkeeping for saveActive(). `pendingRecord` always holds the most
// recent payload (latest wins); `pendingResolvers` lets every coalesced caller
// settle when the single write completes.
let saveTimer = null;
let pendingRecord = null;
let pendingResolvers = [];

function generateId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Some environments expose crypto but throw on access; fall through.
  }
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Reload the conversation list and persistence flag from the store. */
async function refresh() {
  conversations.value = await store.listMeta();
  persistent.value = store.isPersistent();
}

/**
 * Import any legacy single-session transcript, then load the library. Safe to
 * call repeatedly: migrateLegacySession() is idempotent (a no-op once migrated
 * or absent), and refresh() simply re-reads current state.
 */
async function init() {
  await store.migrateLegacySession();
  await refresh();
}

/**
 * Begin a fresh, empty conversation. It becomes active immediately but is not
 * written to the store until the first saveActive() — an abandoned new chat
 * leaves nothing behind.
 */
function create() {
  const id = generateId();
  activeId.value = id;
  return { id };
}

/**
 * Load a stored conversation and mark it active.
 * @returns the transcript state, or null when the id is unknown (activeId is
 *   left untouched in that case).
 */
async function open(id) {
  const record = await store.get(id);
  if (!record) return null;
  activeId.value = id;
  return {
    messages: record.messages,
    chain: record.chain,
    chainExplicit: record.chainExplicit,
  };
}

async function flushSave() {
  saveTimer = null;
  const record = pendingRecord;
  pendingRecord = null;
  const resolvers = pendingResolvers;
  pendingResolvers = [];
  try {
    await store.save(record);
    await refresh();
  } catch {
    // Storage never breaks the panel: a failed background save degrades
    // silently, leaving the live in-memory transcript untouched. The store is
    // itself non-throwing, so this is a belt-and-braces guard.
  } finally {
    // Every coalesced caller settles once — always resolve (never reject) so a
    // fire-and-forget saveActive() can never surface an unhandled rejection.
    for (const resolve of resolvers) resolve();
  }
}

/**
 * Debounced upsert of the active conversation. Rapid calls coalesce into a
 * single write of the most recently supplied record; every caller's promise
 * resolves together when that write settles (a failed write still resolves —
 * the panel is never broken by storage). Title/timestamps are the store's
 * responsibility — this passes through only the live transcript fields so a
 * prior rename is never clobbered here.
 */
function saveActive({ id, messages, chain, chainExplicit }) {
  pendingRecord = { id, messages, chain, chainExplicit };
  return new Promise((resolve) => {
    pendingResolvers.push(resolve);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  });
}

/** Set a human title on a stored conversation, then refresh the list. */
async function rename(id, title) {
  const record = await store.get(id);
  if (!record) return;
  await store.save({ ...record, title });
  await refresh();
}

/**
 * Delete a conversation. If it was the active one, activeId drops to null so
 * the panel knows to fall back to an empty transcript.
 */
async function remove(id) {
  await store.remove(id);
  if (activeId.value === id) activeId.value = null;
  await refresh();
}

/**
 * Render a stored conversation as Markdown for the clipboard via the shared
 * transcript serializer (which deliberately omits unsigned proposals).
 * @returns the Markdown, or "" when the id is unknown.
 */
async function exportMarkdown(id) {
  const record = await store.get(id);
  if (!record) return "";
  return toMarkdown(record.messages, { chain: record.chain });
}

export function useAgentConversations() {
  return {
    conversations,
    activeId,
    persistent,
    init,
    refresh,
    create,
    open,
    saveActive,
    rename,
    remove,
    exportMarkdown,
  };
}

export default useAgentConversations;
