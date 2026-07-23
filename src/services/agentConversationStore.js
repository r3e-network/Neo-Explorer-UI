// Durable, local-first, multi-conversation store for the agent drawer.
//
// Design invariants (see the build contract):
//   - Nothing signable is ever written. A proposal persists only as an inert
//     `{ expired: true }` marker — never scriptHash/tx/args/signers. This module
//     is the single source of truth for that stripping, so the panel no longer
//     hand-rolls it.
//   - Storage never breaks the panel. Every backend call is wrapped; when
//     IndexedDB is unavailable (private mode, disabled, quota) the store falls
//     back to an in-memory backend so the drawer keeps working, just without
//     cross-reload persistence.
//   - Local only. IndexedDB + (fallback) memory. Never localStorage for
//     transcripts — the origin-scoped DB is the boundary.
//
// jsdom ships no IndexedDB, so the store is unit-tested through its injectable
// memory backend; the IndexedDB backend is browser-verified.

export const MAX_CONVERSATIONS = 50; // save() evicts the oldest by updatedAt beyond this.
export const MAX_MESSAGES_PER_CONVERSATION = 100;

const DB_NAME = "neo-explorer-agent";
const DB_VERSION = 1;
const STORE_NAME = "conversations";
const UPDATED_INDEX = "by_updatedAt";
const LEGACY_SESSION_KEY = "neo-explorer-agent-session-v1";

const CHAIN_VALUES = new Set(["n3", "neox", "both"]);
const DEFAULT_CHAIN = "n3";
const TITLE_MAX = 60;
const PREVIEW_MAX = 80;

/* ---------------------------------------------------------------- helpers -- */

function createId() {
  const scope = globalThis.crypto;
  if (scope && typeof scope.randomUUID === "function") {
    try {
      return scope.randomUUID();
    } catch {
      // Non-secure contexts throw; fall through to the entropy-lite id below.
    }
  }
  return `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Non-cloneable (shouldn't happen for plain records); fall through to JSON.
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function isStoredMessage(message) {
  return (
    Boolean(message) &&
    (message.role === "user" || message.role === "assistant" || message.role === "system")
  );
}

function collapse(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function firstUserText(messages) {
  for (const message of messages) {
    if (message && message.role === "user" && typeof message.content === "string") {
      const text = collapse(message.content);
      if (text) return text;
    }
  }
  return "";
}

// Title derives from the first user message (single line, ~60 chars). An empty
// transcript returns '' so the UI can localize its own untitled fallback.
function deriveTitle(messages) {
  const text = firstUserText(messages);
  return text ? truncate(text, TITLE_MAX) : "";
}

function derivePreview(messages) {
  const text = firstUserText(messages);
  return text ? truncate(text, PREVIEW_MAX) : "";
}

function normalizeChain(chain) {
  return CHAIN_VALUES.has(chain) ? chain : DEFAULT_CHAIN;
}

/* ------------------------------------------------------ (de)serialization -- */

// The ONE canonical (de)serialization pair. A proposal is collapsed to a single
// inert marker on the way out and comes back as a single inert marker on the way
// in — nothing signable ever reaches, or returns from, storage.
export function serializeMessage(message) {
  const source = message && typeof message === "object" ? message : {};
  const stored = {
    id: typeof source.id === "string" && source.id ? source.id : createId(),
    role: source.role,
    content: typeof source.content === "string" ? source.content : "",
  };
  if (Array.isArray(source.toolUses)) {
    const tools = source.toolUses.filter((tool) => typeof tool === "string");
    if (tools.length) stored.toolUses = tools;
  }
  if (typeof source.model === "string" && source.model) stored.model = source.model;
  if (source.unavailable) {
    stored.unavailable = true;
    stored.reason = typeof source.reason === "string" ? source.reason : "";
  }
  if (source.stopped) stored.stopped = true;
  if (source.error && typeof source.error === "object") {
    stored.error = { kind: source.error.kind || "generic" };
  }
  if (Array.isArray(source.proposals) && source.proposals.length) {
    stored.proposals = [{ expired: true }];
  }
  return stored;
}

export function deserializeMessage(stored) {
  const source = stored && typeof stored === "object" ? stored : {};
  const message = {
    id: typeof source.id === "string" && source.id ? source.id : createId(),
    role: source.role,
    content: typeof source.content === "string" ? source.content : "",
  };
  if (Array.isArray(source.toolUses)) {
    const tools = source.toolUses.filter((tool) => typeof tool === "string");
    if (tools.length) message.toolUses = tools;
  }
  if (typeof source.model === "string" && source.model) message.model = source.model;
  if (source.unavailable) {
    message.unavailable = true;
    message.reason = typeof source.reason === "string" ? source.reason : "";
  }
  if (source.stopped) message.stopped = true;
  if (source.error && typeof source.error === "object") {
    message.error = { kind: source.error.kind || "generic" };
  }
  if (Array.isArray(source.proposals) && source.proposals.length) {
    message.proposals = [{ expired: true }];
  }
  return message;
}

// Projects a stored record to lightweight list metadata (no full messages).
function recordToMeta(record) {
  const source = record && typeof record === "object" ? record : {};
  const messages = Array.isArray(source.messages) ? source.messages : [];
  return {
    id: source.id,
    title: typeof source.title === "string" ? source.title : "",
    chain: normalizeChain(source.chain),
    createdAt: Number(source.createdAt) || 0,
    updatedAt: Number(source.updatedAt) || 0,
    messageCount: messages.length,
    preview: derivePreview(messages),
  };
}

// Reconstitutes a stored record into a runtime record with deserialized messages.
function hydrate(record) {
  const source = record && typeof record === "object" ? record : {};
  const messages = Array.isArray(source.messages) ? source.messages : [];
  return {
    id: source.id,
    title: typeof source.title === "string" ? source.title : "",
    chain: normalizeChain(source.chain),
    chainExplicit: source.chainExplicit === true,
    createdAt: Number(source.createdAt) || 0,
    updatedAt: Number(source.updatedAt) || 0,
    messages: messages.filter(isStoredMessage).map(deserializeMessage),
  };
}

/* ---------------------------------------------------------------- backends -- */

export function createMemoryBackend() {
  const records = new Map();
  return {
    async getAllMeta() {
      return Array.from(records.values()).map(recordToMeta);
    },
    async get(id) {
      const record = records.get(id);
      return record ? clone(record) : null;
    },
    async put(record) {
      records.set(record.id, clone(record));
      return record;
    },
    async delete(id) {
      records.delete(id);
    },
    async clear() {
      records.clear();
    },
  };
}

export function createIndexedDbBackend() {
  let dbPromise = null;

  function connect() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex(UPDATED_INDEX, "updatedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("neo-explorer-agent DB open blocked"));
    });
    return dbPromise;
  }

  // One request per transaction: the request is issued synchronously so the
  // transaction stays live, and its result is read once the transaction commits.
  async function run(mode, operate) {
    const db = await connect();
    return new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = db.transaction(STORE_NAME, mode);
      } catch (error) {
        reject(error);
        return;
      }
      const store = transaction.objectStore(STORE_NAME);
      const request = operate(store);
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("neo-explorer-agent transaction aborted"));
    });
  }

  return {
    async getAllMeta() {
      const list = await run("readonly", (store) => store.getAll());
      return (Array.isArray(list) ? list : []).map(recordToMeta);
    },
    async get(id) {
      const record = await run("readonly", (store) => store.get(id));
      return record || null;
    },
    async put(record) {
      await run("readwrite", (store) => store.put(record));
      return record;
    },
    async delete(id) {
      await run("readwrite", (store) => store.delete(id));
    },
    async clear() {
      await run("readwrite", (store) => store.clear());
    },
  };
}

function isIndexedDbUsable() {
  try {
    const idb = globalThis.indexedDB;
    return Boolean(idb) && typeof idb.open === "function";
  } catch {
    // Accessing indexedDB can throw in sandboxed contexts.
    return false;
  }
}

/* ------------------------------------------------------ session migration -- */

function sessionStore() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    // Storage access can throw when disabled by policy.
    return null;
  }
}

function dropLegacyKey(session) {
  try {
    session.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Best effort: a blocked removal never breaks migration.
  }
}

/* ------------------------------------------------------------------ store -- */

export function createConversationStore(options = {}) {
  const injected = options && options.backend ? options.backend : null;

  let backend;
  let persistent;
  if (injected) {
    // An injected backend is the memory test target / explicit fallback.
    backend = injected;
    persistent = false;
  } else if (isIndexedDbUsable()) {
    try {
      backend = createIndexedDbBackend();
      persistent = true;
    } catch {
      // Constructing the IndexedDB backend should not throw, but degrade anyway.
      backend = createMemoryBackend();
      persistent = false;
    }
  } else {
    backend = createMemoryBackend();
    persistent = false;
  }

  async function listMeta() {
    try {
      const metas = await backend.getAllMeta();
      const list = Array.isArray(metas) ? metas.slice() : [];
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return list;
    } catch {
      // A failed read degrades to an empty library rather than a broken panel.
      return [];
    }
  }

  async function get(id) {
    if (!id) return null;
    try {
      const record = await backend.get(id);
      return record ? hydrate(record) : null;
    } catch {
      return null;
    }
  }

  // Evicts the oldest conversations by updatedAt once the library overflows.
  async function evictOverflow() {
    try {
      const metas = await backend.getAllMeta();
      const list = Array.isArray(metas) ? metas.slice() : [];
      if (list.length <= MAX_CONVERSATIONS) return;
      list.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
      const overflow = list.slice(0, list.length - MAX_CONVERSATIONS);
      for (const meta of overflow) {
        await backend.delete(meta.id);
      }
    } catch {
      // Eviction is best-effort; a failure never blocks the save that triggered it.
    }
  }

  async function save(record) {
    const input = record && typeof record === "object" ? record : {};
    const id = typeof input.id === "string" && input.id ? input.id : createId();
    const now = Date.now();

    // Preserve createdAt across updates; only mint one for a brand-new record.
    let createdAt = Number(input.createdAt) || 0;
    if (!createdAt) {
      try {
        const existing = await backend.get(id);
        createdAt = existing && Number(existing.createdAt) ? Number(existing.createdAt) : now;
      } catch {
        createdAt = now;
      }
    }

    // Re-strip proposals defensively, cap the message count (keep the newest),
    // and derive the title when one was not set explicitly.
    const runtime = Array.isArray(input.messages) ? input.messages : [];
    const stored = runtime
      .filter(isStoredMessage)
      .slice(-MAX_MESSAGES_PER_CONVERSATION)
      .map(serializeMessage);

    const explicitTitle = typeof input.title === "string" ? input.title.trim() : "";
    const nextRecord = {
      id,
      title: explicitTitle || deriveTitle(stored),
      chain: normalizeChain(input.chain),
      chainExplicit: input.chainExplicit === true,
      createdAt,
      updatedAt: now,
      messages: stored,
    };

    try {
      await backend.put(nextRecord);
      await evictOverflow();
    } catch {
      // Storage never breaks the panel: a failed persist degrades silently and
      // the caller still receives the hydrated record it just tried to save.
    }
    return hydrate(nextRecord);
  }

  async function remove(id) {
    if (!id) return;
    try {
      await backend.delete(id);
    } catch {
      // A failed delete leaves the record in place; it is not fatal.
    }
  }

  async function clear() {
    try {
      await backend.clear();
    } catch {
      // Best effort.
    }
  }

  async function migrateLegacySession() {
    const session = sessionStore();
    if (!session) return null;

    let raw = null;
    try {
      raw = session.getItem(LEGACY_SESSION_KEY);
    } catch {
      // Storage read blocked: nothing to migrate.
      return null;
    }
    if (!raw) return null; // Already migrated or never existed — idempotent no-op.

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt legacy payload: drop it so migration never retries it.
      dropLegacyKey(session);
      return null;
    }

    const legacyMessages = parsed && Array.isArray(parsed.messages) ? parsed.messages : [];
    const usable = legacyMessages.filter(isStoredMessage);
    if (usable.length === 0) {
      dropLegacyKey(session);
      return null;
    }

    // The legacy payload holds already-stored messages; deserialize them so
    // save() re-serializes and re-strips through the single canonical path.
    const saved = await save({
      chain: parsed && parsed.chain,
      chainExplicit: parsed ? parsed.explicit === true : false,
      messages: usable.map(deserializeMessage),
    });

    // Drop the old key only after the import commits, so migration is a no-op on
    // the next call rather than importing the same session twice.
    dropLegacyKey(session);
    return saved.id;
  }

  function isPersistent() {
    return persistent;
  }

  return {
    listMeta,
    get,
    save,
    remove,
    clear,
    migrateLegacySession,
    isPersistent,
  };
}
