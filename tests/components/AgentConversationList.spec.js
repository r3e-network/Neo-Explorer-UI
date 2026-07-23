import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// tf(key, fallback) falls back to the shipped English copy when a key is
// missing; stubbing t to echo the key makes every label render its fallback, so
// the assertions below check the exact contract strings.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

// A deterministic relative-time string keeps the row assertions independent of
// the machine clock and of the app's network-env plumbing.
vi.mock("@/utils/timeFormat", () => ({
  formatAge: vi.fn(() => "5 mins ago"),
}));

// Clipboard is a leaf util; a spy that reports success lets us assert the export
// path both copies and announces.
const clip = vi.hoisted(() => ({ copyTextToClipboard: vi.fn(() => Promise.resolve(true)) }));
vi.mock("@/utils/clipboard", () => ({ copyTextToClipboard: clip.copyTextToClipboard }));

// useAgentConversations is a module-level singleton. We replace it with a
// reactive stand-in: `conversations`/`persistent` are refs the test drives, and
// the mutators are spies. `bag` exposes them plus a reset() so cases can't bleed.
const bag = vi.hoisted(() => ({}));

vi.mock("@/composables/useAgentConversations", async () => {
  const { ref } = await import("vue");

  const conversations = ref([]);
  const persistent = ref(true);

  const rename = vi.fn(() => Promise.resolve());
  const remove = vi.fn(() => Promise.resolve());
  const exportMarkdown = vi.fn(() => Promise.resolve("# Conversation\n\nhello"));

  const useAgentConversations = () => ({
    conversations,
    persistent,
    rename,
    remove,
    exportMarkdown,
  });

  bag.refs = { conversations, persistent };
  bag.fns = { rename, remove, exportMarkdown };
  bag.reset = () => {
    conversations.value = [];
    persistent.value = true;
  };

  return { useAgentConversations, default: useAgentConversations };
});

import AgentConversationList from "@/components/agent/AgentConversationList.vue";

const SAMPLE = [
  {
    id: "c1",
    title: "Block 123 lookup",
    chain: "n3",
    updatedAt: 2_000,
    createdAt: 1_800,
    messageCount: 4,
    preview: "Look up block 123",
  },
  {
    id: "c2",
    title: "",
    chain: "neox",
    updatedAt: 1_000,
    createdAt: 900,
    messageCount: 1,
    preview: "hi",
  },
];

let wrapper;

function makeWrapper(props = {}) {
  return mount(AgentConversationList, {
    props: { open: true, ...props },
    attachTo: document.body,
  });
}

function buttonWithText(text) {
  return wrapper.findAll("button").find((node) => node.text().trim() === text);
}

function iconButtons(label) {
  return wrapper.findAll(`button[aria-label="${label}"]`);
}

beforeEach(() => {
  bag.reset();
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.replaceChildren();
});

describe("AgentConversationList", () => {
  describe("visibility", () => {
    it("renders nothing when closed", () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper({ open: false });
      expect(wrapper.find(".agent-history").exists()).toBe(false);
    });

    it("renders the panel with its title when open", () => {
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-history").exists()).toBe(true);
      expect(wrapper.find(".agent-history-title").text()).toBe("Conversations");
    });
  });

  describe("rows", () => {
    it("renders a row per conversation with title, relative time and message count", () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      const rows = wrapper.findAll(".agent-history-row");
      expect(rows).toHaveLength(2);

      const first = rows[0];
      expect(first.find(".agent-history-name").text()).toBe("Block 123 lookup");
      expect(first.find(".agent-history-time").text()).toBe("5 mins ago");
      expect(first.find(".agent-history-count").text()).toBe("4 messages");
    });

    it("shows the untitled fallback when a conversation has no title", () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      const rows = wrapper.findAll(".agent-history-row");
      expect(rows[1].find(".agent-history-name").text()).toBe("Untitled conversation");
      expect(rows[1].find(".agent-history-count").text()).toBe("1 messages");
    });

    it("emits open with the conversation id when a row is clicked", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await wrapper.findAll(".agent-history-open")[0].trigger("click");
      expect(wrapper.emitted("open")).toHaveLength(1);
      expect(wrapper.emitted("open")[0]).toEqual(["c1"]);
    });
  });

  describe("new chat", () => {
    it("emits new when the New chat button is clicked", async () => {
      wrapper = makeWrapper();
      await buttonWithText("New chat").trigger("click");
      expect(wrapper.emitted("new")).toHaveLength(1);
    });
  });

  describe("rename", () => {
    it("opens an inline editor and calls rename(id, title) on save", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await iconButtons("Rename")[0].trigger("click");

      const input = wrapper.find(".agent-history-input");
      expect(input.exists()).toBe(true);
      await input.setValue("Renamed chat");
      await buttonWithText("Save").trigger("click");

      expect(bag.fns.rename).toHaveBeenCalledTimes(1);
      expect(bag.fns.rename).toHaveBeenCalledWith("c1", "Renamed chat");
      // Editor closes after a successful save.
      await flushPromises();
      expect(wrapper.find(".agent-history-input").exists()).toBe(false);
    });

    it("does not call rename when the edit is cancelled", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await iconButtons("Rename")[0].trigger("click");
      await wrapper.find(".agent-history-input").setValue("throwaway");
      await buttonWithText("Cancel").trigger("click");

      expect(bag.fns.rename).not.toHaveBeenCalled();
      expect(wrapper.find(".agent-history-input").exists()).toBe(false);
    });

    it("treats saving an empty name as a cancel", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await iconButtons("Rename")[0].trigger("click");
      await wrapper.find(".agent-history-input").setValue("   ");
      await buttonWithText("Save").trigger("click");

      expect(bag.fns.rename).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("requires an inline confirm before calling remove(id)", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();

      // The trash icon only arms the confirm; it must not delete on its own.
      await iconButtons("Delete")[0].trigger("click");
      expect(bag.fns.remove).not.toHaveBeenCalled();
      expect(wrapper.find(".agent-history-confirm").text()).toContain(
        "Delete this conversation?",
      );

      await buttonWithText("Delete").trigger("click");
      expect(bag.fns.remove).toHaveBeenCalledTimes(1);
      expect(bag.fns.remove).toHaveBeenCalledWith("c1");
    });

    it("does not call remove when the confirm is cancelled", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await iconButtons("Delete")[0].trigger("click");
      await buttonWithText("Cancel").trigger("click");

      expect(bag.fns.remove).not.toHaveBeenCalled();
      expect(wrapper.find(".agent-history-confirm").exists()).toBe(false);
    });
  });

  describe("export", () => {
    it("copies the exported markdown to the clipboard and announces it", async () => {
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await iconButtons("Copy as markdown")[0].trigger("click");
      await flushPromises();

      expect(bag.fns.exportMarkdown).toHaveBeenCalledTimes(1);
      expect(bag.fns.exportMarkdown).toHaveBeenCalledWith("c1");
      expect(clip.copyTextToClipboard).toHaveBeenCalledWith("# Conversation\n\nhello");
      expect(wrapper.find('[role="status"]').text()).toBe("Conversation copied");
    });

    it("does not announce when the copy fails", async () => {
      clip.copyTextToClipboard.mockResolvedValueOnce(false);
      bag.refs.conversations.value = SAMPLE.slice();
      wrapper = makeWrapper();
      await iconButtons("Copy as markdown")[0].trigger("click");
      await flushPromises();

      expect(wrapper.find('[role="status"]').text()).toBe("");
    });
  });

  describe("empty and non-persistent states", () => {
    it("shows the empty state when there are no conversations", () => {
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-history-list").exists()).toBe(false);
      expect(wrapper.find(".agent-history-empty").text()).toBe("No saved conversations yet.");
    });

    it("shows the not-persistent notice when the store is memory-backed", () => {
      bag.refs.persistent.value = false;
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-history-notice").text()).toBe(
        "History can't be saved in this browser, so conversations are kept only until you reload.",
      );
    });

    it("hides the not-persistent notice when the store is durable", () => {
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-history-notice").exists()).toBe(false);
    });
  });
});
