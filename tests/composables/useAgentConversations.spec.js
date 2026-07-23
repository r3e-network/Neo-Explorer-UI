import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The composable holds one module-level singleton (a store instance + shared
// refs) built at import time, so each test re-imports a fresh module against a
// fresh mocked store — exactly the reload-simulation pattern useAgentSettings
// uses. The mocks below are re-applied automatically after resetModules().

// --- store module mock (P1 is not yet on disk; build against the contract) ---
// A hoisted holder lets every test reach into the same fake store the freshly
// imported composable will receive from createConversationStore().
const storeState = vi.hoisted(() => ({ current: null }));

vi.mock("@/services/agentConversationStore", () => ({
  createConversationStore: vi.fn(() => storeState.current),
}));

// --- transcript serializer mock: assert exportMarkdown formats *via* it ------
const toMarkdownMock = vi.hoisted(() => vi.fn(() => "MARKDOWN_OUTPUT"));
vi.mock("@/utils/agentTranscript", () => ({
  toMarkdown: toMarkdownMock,
  default: { toMarkdown: toMarkdownMock },
}));

function makeFakeStore(overrides = {}) {
  return {
    listMeta: vi.fn(async () => []),
    get: vi.fn(async () => null),
    save: vi.fn(async (record) => record),
    remove: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
    migrateLegacySession: vi.fn(async () => null),
    isPersistent: vi.fn(() => true),
    ...overrides,
  };
}

// Fresh module + fresh fake store for every test → the singleton is reset.
async function loadComposable(store) {
  storeState.current = store;
  vi.resetModules();
  const mod = await import("../../src/composables/useAgentConversations.js");
  return mod.useAgentConversations();
}

let fakeStore;

beforeEach(() => {
  vi.clearAllMocks();
  toMarkdownMock.mockReturnValue("MARKDOWN_OUTPUT");
  fakeStore = makeFakeStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAgentConversations", () => {
  it("returns the same singleton refs and methods across calls", async () => {
    await loadComposable(fakeStore);
    const mod = await import("../../src/composables/useAgentConversations.js");
    const a = mod.useAgentConversations();
    const b = mod.useAgentConversations();
    expect(a.conversations).toBe(b.conversations);
    expect(a.activeId).toBe(b.activeId);
    expect(a.persistent).toBe(b.persistent);
    expect(a.saveActive).toBe(b.saveActive);
    expect(a.open).toBe(b.open);
  });

  it("reflects the store's persistence flag at construction (memory fallback)", async () => {
    const memoryStore = makeFakeStore({ isPersistent: vi.fn(() => false) });
    const c = await loadComposable(memoryStore);
    expect(c.persistent.value).toBe(false);
  });

  describe("init", () => {
    it("migrates the legacy session before refreshing the list", async () => {
      const order = [];
      const store = makeFakeStore({
        migrateLegacySession: vi.fn(async () => {
          order.push("migrate");
          return "new-id";
        }),
        listMeta: vi.fn(async () => {
          order.push("list");
          return [{ id: "a", title: "A", chain: "n3", updatedAt: 2, createdAt: 1, messageCount: 1, preview: "hi" }];
        }),
      });
      const c = await loadComposable(store);

      await c.init();

      expect(store.migrateLegacySession).toHaveBeenCalledTimes(1);
      expect(store.listMeta).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["migrate", "list"]);
      expect(c.conversations.value).toHaveLength(1);
      expect(c.conversations.value[0].id).toBe("a");
    });

    it("is safe to call repeatedly", async () => {
      const c = await loadComposable(fakeStore);
      await c.init();
      await c.init();
      expect(fakeStore.migrateLegacySession).toHaveBeenCalledTimes(2);
      expect(fakeStore.listMeta).toHaveBeenCalledTimes(2);
    });
  });

  describe("refresh", () => {
    it("reloads conversations and the persistence flag from the store", async () => {
      const store = makeFakeStore({
        listMeta: vi.fn(async () => [{ id: "x", title: "X", chain: "n3", updatedAt: 1, createdAt: 1, messageCount: 0, preview: "" }]),
        isPersistent: vi.fn(() => true),
      });
      const c = await loadComposable(store);
      expect(c.conversations.value).toEqual([]);

      await c.refresh();

      expect(c.conversations.value).toHaveLength(1);
      expect(c.conversations.value[0].id).toBe("x");
      expect(c.persistent.value).toBe(true);
    });
  });

  describe("create", () => {
    it("sets a fresh active id and does not write to the store", async () => {
      const c = await loadComposable(fakeStore);
      const { id } = c.create();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
      expect(c.activeId.value).toBe(id);
      expect(fakeStore.save).not.toHaveBeenCalled();
    });

    it("returns a distinct id each call", async () => {
      const c = await loadComposable(fakeStore);
      const first = c.create().id;
      const second = c.create().id;
      expect(first).not.toBe(second);
    });
  });

  describe("open", () => {
    it("loads a stored conversation and marks it active", async () => {
      const record = {
        id: "conv-1",
        title: "Greetings",
        chain: "neox",
        chainExplicit: true,
        messages: [{ id: "m1", role: "user", content: "hi" }],
      };
      const store = makeFakeStore({ get: vi.fn(async () => record) });
      const c = await loadComposable(store);

      const result = await c.open("conv-1");

      expect(store.get).toHaveBeenCalledWith("conv-1");
      expect(result).toEqual({
        messages: record.messages,
        chain: "neox",
        chainExplicit: true,
      });
      expect(c.activeId.value).toBe("conv-1");
    });

    it("returns null and leaves activeId untouched for an unknown id", async () => {
      const store = makeFakeStore({ get: vi.fn(async () => null) });
      const c = await loadComposable(store);
      c.create();
      const activeBefore = c.activeId.value;

      const result = await c.open("missing");

      expect(result).toBeNull();
      expect(c.activeId.value).toBe(activeBefore);
    });
  });

  describe("saveActive (debounced)", () => {
    it("coalesces a burst into a single save of the latest record, then refreshes", async () => {
      vi.useFakeTimers();
      const c = await loadComposable(fakeStore);

      const p1 = c.saveActive({ id: "conv-1", messages: [{ id: "m1", role: "user", content: "one" }], chain: "n3", chainExplicit: false });
      const p2 = c.saveActive({ id: "conv-1", messages: [{ id: "m1", role: "user", content: "two" }], chain: "n3", chainExplicit: false });
      const p3 = c.saveActive({ id: "conv-1", messages: [{ id: "m1", role: "user", content: "three" }], chain: "neox", chainExplicit: true });

      // Nothing written until the debounce window elapses.
      expect(fakeStore.save).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(400);
      await Promise.all([p1, p2, p3]);

      expect(fakeStore.save).toHaveBeenCalledTimes(1);
      expect(fakeStore.save).toHaveBeenCalledWith({
        id: "conv-1",
        messages: [{ id: "m1", role: "user", content: "three" }],
        chain: "neox",
        chainExplicit: true,
      });
      // Save is followed by a list refresh.
      expect(fakeStore.listMeta).toHaveBeenCalledTimes(1);
    });

    it("passes through only transcript fields so a prior rename is not clobbered", async () => {
      vi.useFakeTimers();
      const c = await loadComposable(fakeStore);

      c.saveActive({ id: "conv-1", title: "should-be-ignored", messages: [], chain: "n3", chainExplicit: false, extra: "nope" });
      await vi.advanceTimersByTimeAsync(400);

      expect(fakeStore.save).toHaveBeenCalledWith({ id: "conv-1", messages: [], chain: "n3", chainExplicit: false });
      const arg = fakeStore.save.mock.calls[0][0];
      expect(arg).not.toHaveProperty("title");
      expect(arg).not.toHaveProperty("extra");
    });

    it("writes separately for bursts split across debounce windows", async () => {
      vi.useFakeTimers();
      const c = await loadComposable(fakeStore);

      const first = c.saveActive({ id: "conv-1", messages: [], chain: "n3", chainExplicit: false });
      await vi.advanceTimersByTimeAsync(400);
      await first;

      const second = c.saveActive({ id: "conv-1", messages: [{ id: "m", role: "user", content: "later" }], chain: "n3", chainExplicit: false });
      await vi.advanceTimersByTimeAsync(400);
      await second;

      expect(fakeStore.save).toHaveBeenCalledTimes(2);
    });

    it("still resolves every coalesced caller when the store write fails (never breaks the panel)", async () => {
      vi.useFakeTimers();
      const store = makeFakeStore({ save: vi.fn(async () => { throw new Error("quota"); }) });
      const c = await loadComposable(store);

      const p1 = c.saveActive({ id: "conv-1", messages: [], chain: "n3", chainExplicit: false });
      const p2 = c.saveActive({ id: "conv-1", messages: [], chain: "n3", chainExplicit: false });
      await vi.advanceTimersByTimeAsync(400);

      // A failed write must not reject: fire-and-forget callers stay safe.
      await expect(Promise.all([p1, p2])).resolves.toEqual([undefined, undefined]);
      expect(store.save).toHaveBeenCalledTimes(1);
      // The failed save short-circuits before refresh, so the list is untouched.
      expect(store.listMeta).not.toHaveBeenCalled();
    });
  });

  describe("rename", () => {
    it("saves the fetched record with the new title and refreshes", async () => {
      const record = { id: "conv-1", title: "old", chain: "n3", chainExplicit: false, messages: [{ id: "m", role: "user", content: "hi" }] };
      const store = makeFakeStore({ get: vi.fn(async () => record) });
      const c = await loadComposable(store);

      await c.rename("conv-1", "Fresh Name");

      expect(store.get).toHaveBeenCalledWith("conv-1");
      expect(store.save).toHaveBeenCalledWith({ ...record, title: "Fresh Name" });
      expect(store.listMeta).toHaveBeenCalledTimes(1);
    });

    it("no-ops for an unknown id", async () => {
      const store = makeFakeStore({ get: vi.fn(async () => null) });
      const c = await loadComposable(store);

      await c.rename("missing", "Name");

      expect(store.save).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("removes the conversation and nulls activeId when it was active", async () => {
      const record = { id: "conv-1", title: "t", chain: "n3", chainExplicit: false, messages: [] };
      const store = makeFakeStore({ get: vi.fn(async () => record) });
      const c = await loadComposable(store);
      await c.open("conv-1");
      expect(c.activeId.value).toBe("conv-1");

      await c.remove("conv-1");

      expect(store.remove).toHaveBeenCalledWith("conv-1");
      expect(c.activeId.value).toBeNull();
      expect(store.listMeta).toHaveBeenCalledTimes(1);
    });

    it("leaves activeId intact when removing a non-active conversation", async () => {
      const record = { id: "active", title: "t", chain: "n3", chainExplicit: false, messages: [] };
      const store = makeFakeStore({ get: vi.fn(async () => record) });
      const c = await loadComposable(store);
      await c.open("active");

      await c.remove("other");

      expect(store.remove).toHaveBeenCalledWith("other");
      expect(c.activeId.value).toBe("active");
    });
  });

  describe("exportMarkdown", () => {
    it("formats the stored messages via toMarkdown with the record's chain", async () => {
      const record = {
        id: "conv-1",
        chain: "neox",
        chainExplicit: true,
        messages: [{ id: "m1", role: "user", content: "hello" }],
      };
      const store = makeFakeStore({ get: vi.fn(async () => record) });
      const c = await loadComposable(store);

      const md = await c.exportMarkdown("conv-1");

      expect(store.get).toHaveBeenCalledWith("conv-1");
      expect(toMarkdownMock).toHaveBeenCalledWith(record.messages, { chain: "neox" });
      expect(md).toBe("MARKDOWN_OUTPUT");
    });

    it("returns an empty string for an unknown id without calling the serializer", async () => {
      const store = makeFakeStore({ get: vi.fn(async () => null) });
      const c = await loadComposable(store);

      const md = await c.exportMarkdown("missing");

      expect(md).toBe("");
      expect(toMarkdownMock).not.toHaveBeenCalled();
    });
  });
});
