import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RETRY_COOLDOWN_MS,
  classifyAgentError,
} from "../../src/utils/agentErrors.js";
import { windowHistory } from "../../src/utils/agentHistory.js";
import { toMarkdown } from "../../src/utils/agentTranscript.js";

// --- helpers ---------------------------------------------------------------

/** jsdom exposes `onLine` on Navigator.prototype; shadow it with an own prop. */
function setOnline(value) {
  Object.defineProperty(globalThis.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

function restoreOnline() {
  delete globalThis.navigator.onLine;
}

function serviceError(message, { status } = {}) {
  const error = new Error(message);
  error.name = "AgentServiceError";
  error.code = "agent_request_failed";
  if (status !== undefined) error.status = status;
  return error;
}

function turn(role, content, id) {
  return { id, role, content };
}

/** Deterministic LCG so the fuzz pass is reproducible (no flaky tests). */
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// --- classifyAgentError ----------------------------------------------------

describe("classifyAgentError", () => {
  afterEach(() => {
    restoreOnline();
  });

  it("exports a 15s retry cooldown for the rate-limited case", () => {
    expect(RETRY_COOLDOWN_MS).toBe(15000);
  });

  it("classifies HTTP 429 as rateLimited and retryable", () => {
    const result = classifyAgentError(serviceError("Agent request failed with status 429", { status: 429 }));

    expect(result.kind).toBe("rateLimited");
    expect(result.i18nKey).toBe("agent.errorRateLimited");
    expect(result.retryable).toBe(true);
    expect(result.detail).toBe("Agent request failed with status 429");
  });

  it("classifies HTTP 413 as tooLong and NOT retryable", () => {
    const result = classifyAgentError(serviceError("payload too large", { status: 413 }));

    expect(result.kind).toBe("tooLong");
    expect(result.i18nKey).toBe("agent.errorTooLong");
    // A 413 is deterministic — a Retry button here can never succeed.
    expect(result.retryable).toBe(false);
  });

  it("classifies a transport failure (AgentServiceError without status) as offline", () => {
    const result = classifyAgentError(serviceError("Agent request failed: network error"));

    expect(result.kind).toBe("offline");
    expect(result.i18nKey).toBe("agent.errorOffline");
    expect(result.retryable).toBe(true);
  });

  it("classifies any failure as offline while navigator reports no connection", () => {
    setOnline(false);

    const result = classifyAgentError(new TypeError("Failed to fetch"));

    expect(result.kind).toBe("offline");
    expect(result.i18nKey).toBe("agent.errorOffline");
  });

  it("prefers a real HTTP status over the offline signal", () => {
    setOnline(false);

    expect(classifyAgentError(serviceError("rate limited", { status: 429 })).kind).toBe("rateLimited");
    expect(classifyAgentError(serviceError("too long", { status: 413 })).kind).toBe("tooLong");
  });

  it("classifies everything else as generic and retryable", () => {
    const result = classifyAgentError(serviceError("Agent returned an unparseable response", { status: 500 }));

    expect(result.kind).toBe("generic");
    expect(result.i18nKey).toBe("agent.errorGeneric");
    expect(result.retryable).toBe(true);
    expect(result.detail).toBe("Agent returned an unparseable response");
  });

  it("never throws and returns an empty detail for a missing/odd error", () => {
    for (const value of [null, undefined, "boom", 42, {}, new Error("")]) {
      const result = classifyAgentError(value);
      expect(["rateLimited", "tooLong", "offline", "generic"]).toContain(result.kind);
      expect(typeof result.i18nKey).toBe("string");
      expect(typeof result.retryable).toBe("boolean");
      expect(result.detail).toBe("");
    }
  });

  it("returns exactly the four contract fields", () => {
    expect(Object.keys(classifyAgentError(new Error("x"))).sort()).toEqual([
      "detail",
      "i18nKey",
      "kind",
      "retryable",
    ]);
  });
});

// --- windowHistory ---------------------------------------------------------

describe("windowHistory", () => {
  it("returns the whole conversation untrimmed when it fits both caps", () => {
    const messages = [
      turn("user", "hi", "m1"),
      turn("assistant", "hello", "m2"),
      turn("user", "and now?", "m3"),
    ];

    const { history, trimmedFromId } = windowHistory(messages);

    expect(history).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "and now?" },
    ]);
    expect(trimmedFromId).toBeNull();
  });

  it("drops non-conversation rows exactly like the previous unwindowed map", () => {
    const messages = [
      { id: "s1", role: "system", content: "divider" },
      turn("user", "hi", "m1"),
      { id: "m2", role: "assistant", content: "", unavailable: true },
      { id: "m3", role: "assistant", content: null },
      turn("assistant", "hello", "m4"),
    ];

    const { history } = windowHistory(messages);

    expect(history).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("keeps a 40-turn conversation inside both caps and flags where it was cut", () => {
    const messages = [];
    for (let i = 0; i < 40; i += 1) {
      messages.push(turn("user", `question ${i} ${"q".repeat(200)}`, `u${i}`));
      messages.push(turn("assistant", `answer ${i} ${"a".repeat(200)}`, `a${i}`));
    }

    const { history, trimmedFromId } = windowHistory(messages);

    expect(history.length).toBeLessThanOrEqual(16);
    expect(history.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(7000);
    expect(history[0].role).toBe("user");
    expect(history[history.length - 1].content).toContain("answer 39");
    // The divider is anchored to the first surviving message, not to a index.
    expect(typeof trimmedFromId).toBe("string");
    expect(trimmedFromId).toBe(`u${40 - history.length / 2}`);
  });

  it("never opens the window on an assistant turn (pair integrity)", () => {
    // 4 messages of 1000 chars each: an unaware slicer taking "the last 3"
    // would lead with an assistant turn.
    const messages = [
      turn("user", "a".repeat(1000), "u1"),
      turn("assistant", "b".repeat(1000), "a1"),
      turn("user", "c".repeat(1000), "u2"),
      turn("assistant", "d".repeat(1000), "a2"),
    ];

    const { history } = windowHistory(messages, { maxMessages: 3, maxChars: 7000 });

    expect(history).toEqual([
      { role: "user", content: "c".repeat(1000) },
      { role: "assistant", content: "d".repeat(1000) },
    ]);
  });

  it("drops assistant turns that precede the first user turn", () => {
    const messages = [
      turn("assistant", "orphan greeting", "a0"),
      turn("user", "hi", "u1"),
    ];

    const { history, trimmedFromId } = windowHistory(messages);

    expect(history).toEqual([{ role: "user", content: "hi" }]);
    expect(trimmedFromId).toBe("u1");
  });

  it("honours a character cap that bites before the message cap", () => {
    const messages = [
      turn("user", "x".repeat(900), "u1"),
      turn("assistant", "y".repeat(900), "a1"),
      turn("user", "z".repeat(900), "u2"),
    ];

    const { history, trimmedFromId } = windowHistory(messages, { maxChars: 1000 });

    expect(history).toEqual([{ role: "user", content: "z".repeat(900) }]);
    expect(trimmedFromId).toBe("u2");
  });

  it("falls back to the newest question, clipped, when one exchange busts a cap", () => {
    const messages = [
      turn("user", "old", "u1"),
      turn("assistant", "old answer", "a1"),
      turn("user", "n".repeat(20000), "u2"),
    ];

    const { history, trimmedFromId } = windowHistory(messages);

    expect(history).toHaveLength(1);
    expect(history[0].role).toBe("user");
    expect(history[0].content).toHaveLength(7000);
    expect(trimmedFromId).toBe("u2");
  });

  it("returns an empty history for empty, non-array and assistant-only input", () => {
    expect(windowHistory([])).toEqual({ history: [], trimmedFromId: null });
    expect(windowHistory(null)).toEqual({ history: [], trimmedFromId: null });
    expect(windowHistory(undefined)).toEqual({ history: [], trimmedFromId: null });
    expect(windowHistory([turn("assistant", "only me", "a1")])).toEqual({
      history: [],
      trimmedFromId: null,
    });
  });

  it("falls back to the default caps for invalid options", () => {
    const messages = [];
    for (let i = 0; i < 20; i += 1) {
      messages.push(turn("user", `q${i}`, `u${i}`));
      messages.push(turn("assistant", `a${i}`, `a${i}`));
    }

    for (const options of [{}, { maxMessages: 0 }, { maxMessages: -5 }, { maxChars: Number.NaN }]) {
      const { history } = windowHistory(messages, options);
      expect(history.length).toBeLessThanOrEqual(16);
      expect(history.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(7000);
    }
  });

  it("does not mutate the input messages", () => {
    const messages = [turn("user", "hi", "u1"), turn("assistant", "hello", "a1")];
    const snapshot = JSON.parse(JSON.stringify(messages));

    windowHistory(messages, { maxMessages: 1 });

    expect(messages).toEqual(snapshot);
  });

  it("holds its invariants across 200 randomised conversations (property test)", () => {
    const rng = makeRng(20260723);
    const roles = ["user", "assistant", "system"];

    for (let run = 0; run < 200; run += 1) {
      const maxMessages = 1 + Math.floor(rng() * 20);
      const maxChars = 50 + Math.floor(rng() * 9000);
      const length = Math.floor(rng() * 30);

      const messages = [];
      for (let i = 0; i < length; i += 1) {
        // Mostly alternating, but deliberately jumbled often enough to hit the
        // orphan-assistant and double-user paths.
        const role = rng() < 0.15 ? roles[Math.floor(rng() * roles.length)] : i % 2 === 0 ? "user" : "assistant";
        const size = Math.floor(rng() * 900);
        const content = rng() < 0.1 ? "" : "c".repeat(size);
        messages.push({
          id: rng() < 0.1 ? undefined : `m${run}-${i}`,
          role,
          content: rng() < 0.05 ? null : content,
        });
      }

      const { history, trimmedFromId } = windowHistory(messages, { maxMessages, maxChars });

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(maxMessages);
      expect(history.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(maxChars);
      expect(trimmedFromId === null || typeof trimmedFromId === "string").toBe(true);

      for (const entry of history) {
        expect(["user", "assistant"]).toContain(entry.role);
        expect(typeof entry.content).toBe("string");
        expect(Object.keys(entry).sort()).toEqual(["content", "role"]);
      }

      if (history.length > 0) {
        expect(history[0].role).toBe("user");
      } else {
        // Only legal when nothing was sendable, or no user turn ever led one.
        const hasUser = messages.some(
          (m) => m.role === "user" && typeof m.content === "string" && m.content.length > 0,
        );
        expect(hasUser).toBe(false);
      }
    }
  });
});

// --- toMarkdown ------------------------------------------------------------

describe("toMarkdown", () => {
  it("serializes speakers, chain header, tool trail and model", () => {
    const output = toMarkdown(
      [
        turn("user", "What is in the latest block?", "u1"),
        {
          id: "a1",
          role: "assistant",
          content: "Block 42 holds 3 transactions.",
          toolUses: ["get_latest_block", "get_block_txs"],
          model: "deepseek-chat",
        },
      ],
      { chain: "n3" },
    );

    expect(output).toContain("# Neo Explorer AI conversation");
    expect(output).toContain("Chain: Neo N3");
    expect(output).toContain("**You:**");
    expect(output).toContain("What is in the latest block?");
    expect(output).toContain("**Assistant:**");
    expect(output).toContain("Block 42 holds 3 transactions.");
    expect(output).toContain("Tools used:\n\n- get_latest_block\n- get_block_txs");
    expect(output).toContain("Model: `deepseek-chat`");
    expect(output.endsWith("\n")).toBe(true);
    // Speaker order is preserved.
    expect(output.indexOf("**You:**")).toBeLessThan(output.indexOf("**Assistant:**"));
  });

  it("labels every chain scope and defaults unknown values to N3", () => {
    expect(toMarkdown([], { chain: "neox" })).toContain("Chain: Neo X");
    expect(toMarkdown([], { chain: "both" })).toContain("Chain: Neo N3 + Neo X");
    expect(toMarkdown([], { chain: "N3" })).toContain("Chain: Neo N3");
    expect(toMarkdown([], { chain: "dogecoin" })).toContain("Chain: Neo N3");
    expect(toMarkdown([])).toContain("Chain: Neo N3");
  });

  it("returns a header-only string for empty and invalid input", () => {
    for (const value of [[], null, undefined, "nope", 7]) {
      const output = toMarkdown(value);
      expect(typeof output).toBe("string");
      expect(output).toContain("# Neo Explorer AI conversation");
      expect(output).not.toContain("**You:**");
      expect(output).not.toContain("**Assistant:**");
    }
  });

  it("notes proposals without serializing the transaction payload", () => {
    const output = toMarkdown([
      {
        id: "a1",
        role: "assistant",
        content: "Here is a transfer to review.",
        proposals: [{ scriptHash: "0xdeadbeef", operation: "transfer", tx: { to: "0xabc", data: "0xffff" } }],
      },
    ]);

    expect(output).toContain("1 unsigned transaction proposal shown in the panel (not included here).");
    expect(output).not.toContain("0xdeadbeef");
    expect(output).not.toContain("0xffff");
  });

  it("records state-only turns honestly and skips non-conversation rows", () => {
    const output = toMarkdown([
      { id: "s1", role: "system", content: "divider" },
      { id: "a1", role: "assistant", content: "", stopped: true },
      { id: "a2", role: "assistant", content: "", unavailable: true },
      { id: "a3", role: "assistant", content: "", error: { kind: "generic" } },
      { id: "a4", role: "assistant", content: "" },
    ]);

    expect(output).not.toContain("divider");
    expect(output).toContain("_Stopped before an answer was produced._");
    expect(output).toContain("_The assistant was unavailable._");
    expect(output).toContain("_The request failed._");
    // The empty, stateless turn contributes no speaker heading at all.
    expect(output.match(/\*\*Assistant:\*\*/g)).toHaveLength(3);
  });

  it("does not mutate the input messages", () => {
    const messages = [turn("user", "hi", "u1"), { id: "a1", role: "assistant", content: "yo", toolUses: ["t"] }];
    const snapshot = JSON.parse(JSON.stringify(messages));

    toMarkdown(messages, { chain: "neox" });

    expect(messages).toEqual(snapshot);
  });
});

// --- agentService model passthrough ---------------------------------------

describe("agentService.askAgent model passthrough", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the model reported by the orchestrator alongside the answer", async () => {
    const proposal = { proposal: true, chain: "neox", kind: "eth_tx", tx: {} };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        answer: "Here is your balance.",
        toolUses: ["get_balance"],
        proposals: [proposal],
        model: "deepseek-chat",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent } = await import("../../src/services/agentService.js");
    const result = await askAgent({ query: "what is my balance", chain: "neox" });

    expect(result).toEqual({
      answer: "Here is your balance.",
      toolUses: ["get_balance"],
      proposals: [proposal],
      model: "deepseek-chat",
    });
  });

  it("falls back to an empty model string when the field is absent or not a string", async () => {
    for (const payload of [{ answer: "a" }, { answer: "a", model: 7 }, { answer: "a", model: null }]) {
      vi.resetModules();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload }),
      );

      const { askAgent } = await import("../../src/services/agentService.js");
      const result = await askAgent({ query: "hello" });

      expect(result.model).toBe("");
      expect(result.answer).toBe("a");
      expect(result.toolUses).toEqual([]);
      expect(result.proposals).toEqual([]);
    }
  });

  it("leaves the request shape untouched", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ answer: "", toolUses: [], proposals: [], model: "m" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent } = await import("../../src/services/agentService.js");
    const messages = [{ role: "user", content: "hi" }];
    await askAgent({ messages, query: "ignored", chain: "both" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/agent");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ Accept: "application/json", "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual({ messages, chain: "both" });
  });

  it("still resolves to the unavailable state on 503 and 502", async () => {
    for (const [status, reason] of [
      [503, "agent_unconfigured"],
      [502, "agent_upstream_error"],
    ]) {
      vi.resetModules();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ unavailable: true, reason }) }),
      );

      const { askAgent } = await import("../../src/services/agentService.js");
      await expect(askAgent({ query: "hello" })).resolves.toEqual({ unavailable: true, reason });
    }
  });

  it("still throws AgentServiceError on a network fault and on an unexpected status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    const mod = await import("../../src/services/agentService.js");
    await expect(mod.askAgent({ query: "hello" })).rejects.toBeInstanceOf(mod.AgentServiceError);

    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "boom" }) }),
    );
    const reloaded = await import("../../src/services/agentService.js");
    await expect(reloaded.askAgent({ query: "hello" })).rejects.toBeInstanceOf(reloaded.AgentServiceError);
  });

  it("classifies a thrown 429/413 from askAgent through classifyAgentError", async () => {
    for (const [status, kind] of [
      [429, "rateLimited"],
      [413, "tooLong"],
    ]) {
      vi.resetModules();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) }),
      );

      const { askAgent } = await import("../../src/services/agentService.js");
      const error = await askAgent({ query: "hello" }).catch((err) => err);

      expect(classifyAgentError(error).kind).toBe(kind);
    }
  });
});
