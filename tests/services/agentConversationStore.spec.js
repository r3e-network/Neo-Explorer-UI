import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  createConversationStore,
  createMemoryBackend,
  deserializeMessage,
  serializeMessage,
} from "@/services/agentConversationStore";

const LEGACY_KEY = "neo-explorer-agent-session-v1";

// A deterministic clock so updatedAt ordering (list sort, eviction) is stable.
let clock = 1_000;
function tick(ms = 1) {
  clock += ms;
  return clock;
}

// A controllable sessionStorage stand-in — the migration seam reads
// globalThis.sessionStorage, so a fake keeps the test independent of the env.
function fakeSession(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    has: (key) => map.has(key),
  };
}

beforeEach(() => {
  clock = 1_000;
  vi.spyOn(Date, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("serializeMessage / deserializeMessage", () => {
  it("keeps the allowed fields and drops everything else", () => {
    const stored = serializeMessage({
      id: "m1",
      role: "assistant",
      content: "hello",
      toolUses: ["get_block", 42, "get_tx"],
      model: "claude",
      stopped: true,
      error: { kind: "offline", detail: "leaks?" },
      injected: "nope",
    });

    expect(stored).toEqual({
      id: "m1",
      role: "assistant",
      content: "hello",
      toolUses: ["get_block", "get_tx"],
      model: "claude",
      stopped: true,
      error: { kind: "offline" },
    });
    expect(stored).not.toHaveProperty("injected");
  });

  it("collapses any proposal payload to a single inert marker in both directions", () => {
    const stored = serializeMessage({
      id: "m2",
      role: "assistant",
      content: "sign this",
      proposals: [
        { scriptHash: "0xabc", operation: "transfer", args: [1, 2], signers: [{ account: "x" }] },
        { tx: { to: "0xdef", value: "1", data: "0xdeadbeef" } },
      ],
    });

    expect(stored.proposals).toEqual([{ expired: true }]);
    expect(JSON.stringify(stored)).not.toMatch(/scriptHash|args|signers|tx|0xdeadbeef/);

    const runtime = deserializeMessage(stored);
    expect(runtime.proposals).toEqual([{ expired: true }]);
  });

  it("mints an id when one is missing and defaults content to an empty string", () => {
    const runtime = deserializeMessage({ role: "user" });
    expect(typeof runtime.id).toBe("string");
    expect(runtime.id.length).toBeGreaterThan(0);
    expect(runtime.content).toBe("");
  });
});

describe("createConversationStore — round-trip", () => {
  it("saves and reloads a conversation with all message shapes intact", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });

    const saved = await store.save({
      id: "c1",
      chain: "neox",
      chainExplicit: true,
      messages: [
        { id: "u1", role: "user", content: "What is block 5?" },
        {
          id: "a1",
          role: "assistant",
          content: "Here it is.",
          toolUses: ["get_block"],
          model: "claude",
          proposals: [{ scriptHash: "0x1", args: [1] }],
        },
        { id: "s1", role: "system", content: "Switched to Neo X." },
      ],
    });

    expect(saved.id).toBe("c1");
    expect(saved.chain).toBe("neox");
    expect(saved.chainExplicit).toBe(true);
    expect(saved.title).toBe("What is block 5?");
    expect(saved.createdAt).toBeGreaterThan(0);
    expect(saved.updatedAt).toBeGreaterThan(0);

    const loaded = await store.get("c1");
    expect(loaded.messages).toHaveLength(3);
    expect(loaded.messages[1]).toMatchObject({
      role: "assistant",
      content: "Here it is.",
      toolUses: ["get_block"],
      model: "claude",
      proposals: [{ expired: true }],
    });
    expect(loaded.messages[2]).toMatchObject({ role: "system", content: "Switched to Neo X." });
  });

  it("returns null for an unknown or empty id", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    expect(await store.get("missing")).toBeNull();
    expect(await store.get("")).toBeNull();
  });

  it("preserves createdAt across an update but advances updatedAt", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const first = await store.save({ id: "c1", messages: [{ role: "user", content: "hi" }] });
    tick(500);
    const second = await store.save({ id: "c1", messages: [{ role: "user", content: "hi again" }] });

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
  });
});

describe("createConversationStore — proposal stripping at rest", () => {
  it("never writes anything signable to the backend record", async () => {
    const backend = createMemoryBackend();
    const store = createConversationStore({ backend });

    await store.save({
      id: "c1",
      messages: [
        {
          role: "assistant",
          content: "proposal",
          proposals: [
            { scriptHash: "0xabc", operation: "transfer", args: [1], signers: [{ account: "a" }] },
            { tx: { to: "0xdef", value: "9", data: "0xdeadbeef" } },
          ],
        },
      ],
    });

    // Inspect the raw stored record straight from the injected backend.
    const raw = await backend.get("c1");
    expect(raw.messages[0].proposals).toEqual([{ expired: true }]);
    expect(JSON.stringify(raw)).not.toMatch(/scriptHash|operation|args|signers|0xdef|0xdeadbeef/);
  });
});

describe("createConversationStore — title derivation", () => {
  it("derives the title from the first user message", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const saved = await store.save({
      id: "c1",
      messages: [
        { role: "system", content: "divider" },
        { role: "user", content: "  Explain\nthe   NEO token  " },
      ],
    });
    expect(saved.title).toBe("Explain the NEO token");
  });

  it("truncates a long first message to a single ~60 char line", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const long = "a".repeat(200);
    const saved = await store.save({ id: "c1", messages: [{ role: "user", content: long }] });
    expect(saved.title.length).toBeLessThanOrEqual(60);
    expect(saved.title.endsWith("…")).toBe(true);
  });

  it("keeps an explicitly provided title over the derived one", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const saved = await store.save({
      id: "c1",
      title: "  My renamed chat  ",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(saved.title).toBe("My renamed chat");
  });

  it("returns an empty title for an empty transcript (UI localizes the fallback)", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const saved = await store.save({ id: "c1", messages: [] });
    expect(saved.title).toBe("");
  });
});

describe("createConversationStore — listMeta", () => {
  it("sorts by updatedAt desc, omits full messages, and includes a preview", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });

    tick();
    await store.save({ id: "old", messages: [{ role: "user", content: "oldest" }] });
    tick();
    await store.save({ id: "mid", messages: [{ role: "user", content: "middle" }] });
    tick();
    await store.save({
      id: "new",
      messages: [
        { role: "system", content: "divider" },
        { role: "user", content: "the newest question here" },
      ],
    });

    const list = await store.listMeta();
    expect(list.map((meta) => meta.id)).toEqual(["new", "mid", "old"]);

    const newest = list[0];
    expect(newest).toMatchObject({ id: "new", messageCount: 2, preview: "the newest question here" });
    expect(Object.prototype.hasOwnProperty.call(newest, "messages")).toBe(false);
  });

  it("truncates the preview to ~80 chars", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    await store.save({ id: "c1", messages: [{ role: "user", content: "b".repeat(200) }] });
    const [meta] = await store.listMeta();
    expect(meta.preview.length).toBeLessThanOrEqual(80);
    expect(meta.preview.endsWith("…")).toBe(true);
  });
});

describe("createConversationStore — caps and eviction", () => {
  it("caps messages per conversation, keeping the newest", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const many = Array.from({ length: MAX_MESSAGES_PER_CONVERSATION + 50 }, (_, i) => ({
      role: "user",
      content: `msg-${i}`,
    }));

    await store.save({ id: "c1", messages: many });
    const loaded = await store.get("c1");

    expect(loaded.messages).toHaveLength(MAX_MESSAGES_PER_CONVERSATION);
    expect(loaded.messages[0].content).toBe("msg-50");
    expect(loaded.messages.at(-1).content).toBe(`msg-${MAX_MESSAGES_PER_CONVERSATION + 49}`);
  });

  it("evicts the oldest conversations beyond MAX_CONVERSATIONS", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    const total = MAX_CONVERSATIONS + 2;

    for (let i = 0; i < total; i += 1) {
      tick();
      await store.save({ id: `c${i}`, messages: [{ role: "user", content: `q${i}` }] });
    }

    const list = await store.listMeta();
    expect(list).toHaveLength(MAX_CONVERSATIONS);
    // The two oldest were dropped; the newest survives.
    expect(await store.get("c0")).toBeNull();
    expect(await store.get("c1")).toBeNull();
    expect(await store.get(`c${total - 1}`)).not.toBeNull();
  });
});

describe("createConversationStore — remove and clear", () => {
  it("removes a single conversation", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    await store.save({ id: "c1", messages: [{ role: "user", content: "hi" }] });
    await store.remove("c1");
    expect(await store.get("c1")).toBeNull();
  });

  it("clears the whole library", async () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    await store.save({ id: "c1", messages: [{ role: "user", content: "hi" }] });
    await store.save({ id: "c2", messages: [{ role: "user", content: "yo" }] });
    await store.clear();
    expect(await store.listMeta()).toEqual([]);
  });
});

describe("createConversationStore — legacy migration", () => {
  const legacyPayload = {
    v: 1,
    chain: "neox",
    explicit: true,
    messages: [
      { id: "u1", role: "user", content: "Legacy question" },
      { id: "a1", role: "assistant", content: "Legacy answer", proposals: [{ expired: true }] },
    ],
  };

  it("imports the old sessionStorage session as one conversation and clears the key", async () => {
    const session = fakeSession({ [LEGACY_KEY]: JSON.stringify(legacyPayload) });
    vi.stubGlobal("sessionStorage", session);

    const store = createConversationStore({ backend: createMemoryBackend() });
    const id = await store.migrateLegacySession();

    expect(typeof id).toBe("string");
    expect(session.has(LEGACY_KEY)).toBe(false);

    const loaded = await store.get(id);
    expect(loaded.chain).toBe("neox");
    expect(loaded.chainExplicit).toBe(true);
    expect(loaded.title).toBe("Legacy question");
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[1].proposals).toEqual([{ expired: true }]);
  });

  it("is idempotent — a second call is a no-op", async () => {
    const session = fakeSession({ [LEGACY_KEY]: JSON.stringify(legacyPayload) });
    vi.stubGlobal("sessionStorage", session);

    const store = createConversationStore({ backend: createMemoryBackend() });
    await store.migrateLegacySession();
    const second = await store.migrateLegacySession();

    expect(second).toBeNull();
    expect(await store.listMeta()).toHaveLength(1);
  });

  it("returns null and drops a corrupt payload", async () => {
    const session = fakeSession({ [LEGACY_KEY]: "not-json{" });
    vi.stubGlobal("sessionStorage", session);

    const store = createConversationStore({ backend: createMemoryBackend() });
    expect(await store.migrateLegacySession()).toBeNull();
    expect(session.has(LEGACY_KEY)).toBe(false);
    expect(await store.listMeta()).toHaveLength(0);
  });

  it("returns null when no legacy session exists", async () => {
    vi.stubGlobal("sessionStorage", fakeSession());
    const store = createConversationStore({ backend: createMemoryBackend() });
    expect(await store.migrateLegacySession()).toBeNull();
  });
});

describe("createConversationStore — persistence flag and graceful failure", () => {
  it("reports non-persistent for an injected (memory) backend", () => {
    const store = createConversationStore({ backend: createMemoryBackend() });
    expect(store.isPersistent()).toBe(false);
  });

  it("auto-selects the memory fallback (non-persistent) when IndexedDB is absent", () => {
    // jsdom ships no IndexedDB, so the auto-selected backend is memory.
    const store = createConversationStore();
    expect(store.isPersistent()).toBe(false);
  });

  it("degrades gracefully when a backend operation throws", async () => {
    const boom = () => {
      throw new Error("backend down");
    };
    const throwingBackend = {
      getAllMeta: boom,
      get: boom,
      put: boom,
      delete: boom,
      clear: boom,
    };
    const store = createConversationStore({ backend: throwingBackend });

    await expect(store.listMeta()).resolves.toEqual([]);
    await expect(store.get("c1")).resolves.toBeNull();
    await expect(store.remove("c1")).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();

    // save() still resolves with the hydrated record it tried to persist.
    const saved = await store.save({ id: "c1", messages: [{ role: "user", content: "hi" }] });
    expect(saved).toMatchObject({ id: "c1", title: "hi" });
    expect(saved.messages).toHaveLength(1);
  });
});
