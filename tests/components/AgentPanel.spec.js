import { mount, flushPromises } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createRouter, createMemoryHistory } from "vue-router";
import { nextTick } from "vue";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({ askAgent: vi.fn() }));
const clipboardMock = vi.hoisted(() => ({ copyTextToClipboard: vi.fn(async () => true) }));
const signerMock = vi.hoisted(() => ({ signProposal: vi.fn() }));

vi.mock("@/services/agentService", () => ({
  askAgent: serviceMock.askAgent,
  AgentServiceError: class AgentServiceError extends Error {},
  default: { askAgent: serviceMock.askAgent },
}));

vi.mock("@/utils/clipboard", () => ({
  copyTextToClipboard: clipboardMock.copyTextToClipboard,
}));

vi.mock("@/utils/proposalSigner", () => {
  class ProposalSignerError extends Error {
    constructor(message, code) {
      super(message);
      this.name = "ProposalSignerError";
      if (code) this.code = code;
    }
  }
  return {
    signProposal: signerMock.signProposal,
    default: signerMock.signProposal,
    ProposalSignerError,
  };
});

import AgentPanel from "@/components/agent/AgentPanel.vue";
import AgentProposalCard from "@/components/agent/AgentProposalCard.vue";
import panelSource from "@/components/agent/AgentPanel.vue?raw";
import en from "@/lang/en";

const STORAGE_KEY = "neo-explorer-agent-session-v1";

const GAS_SCRIPT_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const N3_FROM = "NgebdUkFxSbzLMruXopuBw4aKsXX8sTyxw";
const N3_TO = "Naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function n3Proposal(overrides = {}) {
  return {
    chain: "n3",
    kind: "invoke",
    summary: "Transfer 1 GAS to a new address.",
    scriptHash: GAS_SCRIPT_HASH,
    operation: "transfer",
    args: [
      { type: "Hash160", value: N3_FROM },
      { type: "Hash160", value: N3_TO },
      { type: "Integer", value: "100000000" },
    ],
    signers: [{ account: N3_FROM, scopes: "CalledByEntry" }],
    ...overrides,
  };
}

const Blank = { name: "Blank", template: "<div />" };

const wrappers = [];
let router;
let i18n;
let fab;

// jsdom reports `offsetParent === null` for every element, which makes
// useFocusTrap's visibility filter drop all candidates. Restoring a plausible
// value is what lets the Tab-trap assertions exercise the real code path.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });

  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", name: "blank", component: Blank }],
  });

  i18n = createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    missingWarn: false,
    fallbackWarn: false,
    messages: { en },
  });
});

function setViewport(wide) {
  window.matchMedia = vi.fn((query) => ({
    matches: wide,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

beforeEach(async () => {
  serviceMock.askAgent.mockReset();
  serviceMock.askAgent.mockResolvedValue({
    answer: "The latest block is 100.",
    toolUses: [],
    proposals: [],
    model: "",
  });
  clipboardMock.copyTextToClipboard.mockClear();
  clipboardMock.copyTextToClipboard.mockResolvedValue(true);
  signerMock.signProposal.mockReset();
  window.sessionStorage.clear();
  document.body.className = "";
  setViewport(true);

  // Stands in for the launcher FAB: focus must come back here on close.
  fab = document.createElement("button");
  fab.id = "fab";
  document.body.appendChild(fab);

  await router.replace("/");
  await router.isReady();
});

afterEach(() => {
  while (wrappers.length) wrappers.pop().unmount();
  removeScrollMetrics();
  document.body.innerHTML = "";
  document.body.className = "";
  window.sessionStorage.clear();
  vi.useRealTimers();
});

async function mountPanel({ open = true, path = "/" } = {}) {
  if (path !== "/") {
    await router.replace(path);
    await router.isReady();
  }
  const wrapper = mount(AgentPanel, {
    props: { open },
    attachTo: document.body,
    global: { plugins: [router, i18n] },
  });
  wrappers.push(wrapper);
  await flushPromises();
  await nextTick();
  await nextTick();
  return wrapper;
}

const panelEl = () => document.getElementById("agent-panel");
const q = (selector) => document.querySelector(selector);
const qa = (selector) => Array.from(document.querySelectorAll(selector));
const bodyText = () => document.body.textContent || "";

function buttonByLabel(label) {
  return qa("#agent-panel button").find(
    (node) => node.getAttribute("aria-label") === label || node.textContent.trim() === label,
  );
}

async function ask(text) {
  const textarea = q("#agent-panel textarea");
  textarea.value = text;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  const form = q("#agent-panel form");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flushPromises();
  await nextTick();
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// jsdom reports 0 for every scroll metric. The metrics are installed on
// HTMLDivElement.prototype rather than on one element because @vue/test-utils
// re-creates a <Transition>'s child element on every update (a plain
// `createApp` mount does not), so an instance-level stub would be discarded on
// the first re-render. Only `.agent-transcript` divs are affected, so the
// composer's textarea autosize still sees its real metrics.
function installScrollMetrics({ scrollHeight, clientHeight }) {
  const state = { top: 0 };
  const proto = window.HTMLDivElement.prototype;
  Object.defineProperty(proto, "scrollHeight", {
    configurable: true,
    get() {
      return this.classList.contains("agent-transcript") ? scrollHeight : 0;
    },
  });
  Object.defineProperty(proto, "clientHeight", {
    configurable: true,
    get() {
      return this.classList.contains("agent-transcript") ? clientHeight : 0;
    },
  });
  Object.defineProperty(proto, "scrollTop", {
    configurable: true,
    get() {
      return this.classList.contains("agent-transcript") ? state.top : 0;
    },
    set(value) {
      if (this.classList.contains("agent-transcript")) state.top = value;
    },
  });
  scrollMetricsInstalled = true;
  return state;
}

let scrollMetricsInstalled = false;

function removeScrollMetrics() {
  if (!scrollMetricsInstalled) return;
  const proto = window.HTMLDivElement.prototype;
  delete proto.scrollHeight;
  delete proto.clientHeight;
  delete proto.scrollTop;
  scrollMetricsInstalled = false;
}

/* ------------------------------------------------------------ modality --- */

describe("AgentPanel — modality and focus", () => {
  it("marks the body only while the drawer is open", async () => {
    const wrapper = await mountPanel({ open: false });
    expect(document.body.classList.contains("agent-drawer-open")).toBe(false);

    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(document.body.classList.contains("agent-drawer-open")).toBe(true);

    await wrapper.setProps({ open: false });
    await flushPromises();
    expect(document.body.classList.contains("agent-drawer-open")).toBe(false);
  });

  it("clears the body marker on unmount", async () => {
    const wrapper = await mountPanel({ open: true });
    expect(document.body.classList.contains("agent-drawer-open")).toBe(true);
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    wrapper.unmount();
    expect(document.body.classList.contains("agent-drawer-open")).toBe(false);
  });

  it("locks background scroll while open and restores the body style on close", async () => {
    const before = document.body.style.cssText;
    const wrapper = await mountPanel({ open: true });
    expect(document.body.style.position).toBe("fixed");

    await wrapper.setProps({ open: false });
    await flushPromises();
    expect(document.body.style.position).toBe("");
    expect(document.body.style.cssText).toBe(before);
  });

  it("closes on Escape no matter where focus sits", async () => {
    const wrapper = await mountPanel({ open: true });
    fab.focus();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("stops listening for Escape once closed", async () => {
    const wrapper = await mountPanel({ open: true });
    await wrapper.setProps({ open: false });
    await flushPromises();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("close")).toBeFalsy();
  });

  it("renders the backdrop at every breakpoint and closes on a backdrop click", async () => {
    const wrapper = await mountPanel({ open: true });
    const backdrop = q(".agent-backdrop");
    expect(backdrop).toBeTruthy();
    // `md:hidden` used to make aria-modal a lie on desktop.
    expect(backdrop.className).not.toContain("md:hidden");
    backdrop.dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("wires the dialog semantics the launcher and composer depend on", async () => {
    await mountPanel({ open: true });
    const aside = panelEl();
    expect(aside.getAttribute("role")).toBe("dialog");
    expect(aside.getAttribute("aria-modal")).toBe("true");
    expect(aside.getAttribute("aria-labelledby")).toBe("agent-panel-title");
    expect(aside.getAttribute("aria-describedby")).toBe("agent-disclaimer");
    expect(aside.getAttribute("tabindex")).toBe("-1");
    expect(aside.getAttribute("aria-busy")).toBe("false");
    expect(document.getElementById("agent-panel-title")).toBeTruthy();
    // WP-H renders the described-by target; the IDREF must resolve.
    expect(document.getElementById("agent-disclaimer")).toBeTruthy();
  });

  it("keeps role=log without a redundant aria-live and announces through a status node", async () => {
    await mountPanel({ open: true });
    const log = q(".agent-transcript");
    expect(log.getAttribute("role")).toBe("log");
    expect(log.hasAttribute("aria-live")).toBe(false);
    expect(log.getAttribute("aria-label")).toBe(en.agent.transcriptLabel);

    const status = q('#agent-panel [role="status"]');
    expect(status).toBeTruthy();
    expect(status.className).toContain("sr-only");

    await ask("what is in the latest block?");
    expect(q('#agent-panel [role="status"]').textContent.trim()).toBe(en.agent.answerReady);
  });

  it("announces proposals separately so the reader is told to review", async () => {
    serviceMock.askAgent.mockResolvedValue({
      answer: "Here is a transfer.",
      toolUses: [],
      proposals: [n3Proposal()],
      model: "",
    });
    await mountPanel({ open: true });
    await ask("prepare a transfer");
    expect(q('#agent-panel [role="status"]').textContent.trim()).toBe(
      en.agent.answerReadyWithProposals,
    );
  });

  it("traps Tab inside the drawer", async () => {
    await mountPanel({ open: true });
    const focusable = qa(
      '#agent-panel a[href], #agent-panel button:not([disabled]), #agent-panel textarea, #agent-panel input:not([disabled])',
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    last.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("restores focus to the launcher when the drawer closes", async () => {
    fab.focus();
    const wrapper = await mountPanel({ open: true });
    expect(document.activeElement).not.toBe(fab);

    await wrapper.setProps({ open: false });
    await flushPromises();
    expect(document.activeElement).toBe(fab);
  });

  it("focuses the composer on desktop but only the container on mobile", async () => {
    setViewport(true);
    const desktop = await mountPanel({ open: true });
    expect(document.activeElement.tagName).toBe("TEXTAREA");
    wrappers.splice(wrappers.indexOf(desktop), 1);
    desktop.unmount();
    document.body.innerHTML = "";
    document.body.appendChild(fab);

    setViewport(false);
    await mountPanel({ open: true });
    // The soft keyboard would otherwise cover the drawer the user just opened.
    expect(document.activeElement).toBe(panelEl());
  });
});

/* -------------------------------------------------------- conversation --- */

describe("AgentPanel — conversation", () => {
  it("sends a windowed history and the pinned chain", async () => {
    await mountPanel({ open: true });
    await ask("hello");
    expect(serviceMock.askAgent).toHaveBeenCalledTimes(1);
    const call = serviceMock.askAgent.mock.calls[0][0];
    expect(call.chain).toBe("n3");
    expect(call.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(call.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps a 40-turn conversation inside the backend caps and shows the trim divider", async () => {
    await mountPanel({ open: true });
    const question = `Explain this transaction. ${"detail ".repeat(30)}`;

    for (let turn = 0; turn < 40; turn += 1) {
      serviceMock.askAgent.mockResolvedValueOnce({
        answer: `Answer ${turn}. ${"body ".repeat(30)}`,
        toolUses: [],
        proposals: [],
        model: "",
      });
      await ask(`${question}#${turn}`);
    }

    const last = serviceMock.askAgent.mock.calls.at(-1)[0];
    expect(last.messages.length).toBeLessThanOrEqual(16);
    const chars = last.messages.reduce((total, message) => total + message.content.length, 0);
    expect(chars).toBeLessThanOrEqual(7000);
    // The window must never open on an assistant turn.
    expect(last.messages[0].role).toBe("user");
    expect(bodyText()).toContain(en.agent.historyTrimmed);
  });

  it("classifies a 413 as un-retryable instead of a generic failure", async () => {
    const error = new Error("payload too large");
    error.status = 413;
    serviceMock.askAgent.mockRejectedValue(error);

    await mountPanel({ open: true });
    await ask("a very long conversation");

    expect(bodyText()).toContain(en.agent.errorTooLong);
    expect(buttonByLabel(en.agent.retry)).toBeUndefined();
  });

  it("offers a working retry for a generic failure", async () => {
    serviceMock.askAgent.mockRejectedValueOnce(new Error("boom"));
    await mountPanel({ open: true });
    await ask("hello");
    expect(bodyText()).toContain(en.agent.errorGeneric);

    serviceMock.askAgent.mockResolvedValueOnce({
      answer: "Recovered.",
      toolUses: [],
      proposals: [],
      model: "",
    });
    buttonByLabel(en.agent.retry).dispatchEvent(new Event("click", { bubbles: true }));
    await flushPromises();
    await nextTick();

    expect(serviceMock.askAgent).toHaveBeenCalledTimes(2);
    expect(bodyText()).toContain("Recovered.");
    expect(bodyText()).not.toContain(en.agent.errorGeneric);
  });

  it("shows progressive loading copy without claiming to know what is happening", async () => {
    vi.useFakeTimers();
    const pending = deferred();
    serviceMock.askAgent.mockReturnValue(pending.promise);

    await mountPanel({ open: true });
    const textarea = q("#agent-panel textarea");
    textarea.value = "slow question";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    q("#agent-panel form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    expect(q(".agent-loading-text").textContent.trim()).toBe(en.agent.thinking);

    vi.advanceTimersByTime(10_000);
    await nextTick();
    expect(q(".agent-loading-text").textContent.trim()).toBe(en.agent.workingOnIt);
    expect(q(".agent-elapsed").textContent.trim()).toBe("10s");

    vi.advanceTimersByTime(20_000);
    await nextTick();
    expect(q(".agent-loading-text").textContent.trim()).toBe(en.agent.takingLonger);

    pending.resolve({ answer: "done", toolUses: [], proposals: [], model: "" });
    vi.useRealTimers();
    await flushPromises();
  });

  it("leaves a stopped marker with a working Regenerate when the user stops", async () => {
    const pending = deferred();
    serviceMock.askAgent.mockReturnValueOnce(pending.promise);

    await mountPanel({ open: true });
    const textarea = q("#agent-panel textarea");
    textarea.value = "long question";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    q("#agent-panel form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    const stop = buttonByLabel(en.agent.stop);
    expect(stop).toBeTruthy();
    stop.dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    pending.reject(abortError);
    await flushPromises();
    await nextTick();

    expect(bodyText()).toContain(en.agent.stopped);
    const regenerate = buttonByLabel(en.agent.regenerate);
    expect(regenerate).toBeTruthy();

    serviceMock.askAgent.mockResolvedValueOnce({
      answer: "Second attempt.",
      toolUses: [],
      proposals: [],
      model: "",
    });
    regenerate.dispatchEvent(new Event("click", { bubbles: true }));
    await flushPromises();
    await nextTick();
    expect(bodyText()).toContain("Second attempt.");
    expect(bodyText()).not.toContain(en.agent.stopped);
  });

  it("lets a late abort rejection land without killing the request that replaced it", async () => {
    const first = deferred();
    serviceMock.askAgent.mockReturnValueOnce(first.promise);

    await mountPanel({ open: true });
    const textarea = q("#agent-panel textarea");
    textarea.value = "first question";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    q("#agent-panel form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    buttonByLabel(en.agent.stop).dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();

    // Regenerate before the aborted fetch has rejected.
    const second = deferred();
    serviceMock.askAgent.mockReturnValueOnce(second.promise);
    buttonByLabel(en.agent.regenerate).dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(panelEl().getAttribute("aria-busy")).toBe("true");

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    first.reject(abortError);
    await flushPromises();
    await nextTick();

    // The stale rejection must not clear the second request's loading state.
    expect(panelEl().getAttribute("aria-busy")).toBe("true");
    expect(buttonByLabel(en.agent.stop)).toBeTruthy();

    second.resolve({ answer: "Second answer.", toolUses: [], proposals: [], model: "" });
    await flushPromises();
    await nextTick();
    expect(panelEl().getAttribute("aria-busy")).toBe("false");
    expect(bodyText()).toContain("Second answer.");
  });

  it("does not abort an in-flight request when the drawer is closed", async () => {
    const pending = deferred();
    serviceMock.askAgent.mockReturnValueOnce(pending.promise);

    const wrapper = await mountPanel({ open: true });
    const textarea = q("#agent-panel textarea");
    textarea.value = "keep going";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    q("#agent-panel form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    const { signal } = serviceMock.askAgent.mock.calls[0][0];
    await wrapper.setProps({ open: false });
    await flushPromises();
    expect(signal.aborted).toBe(false);

    pending.resolve({ answer: "Landed while closed.", toolUses: [], proposals: [], model: "" });
    await flushPromises();

    await wrapper.setProps({ open: true });
    await flushPromises();
    await nextTick();
    expect(bodyText()).toContain("Landed while closed.");
  });

  it("aborts in flight work on unmount", async () => {
    const pending = deferred();
    serviceMock.askAgent.mockReturnValueOnce(pending.promise);

    const wrapper = await mountPanel({ open: true });
    const textarea = q("#agent-panel textarea");
    textarea.value = "question";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    q("#agent-panel form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    const { signal } = serviceMock.askAgent.mock.calls[0][0];
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    wrapper.unmount();
    expect(signal.aborted).toBe(true);
    pending.resolve({ answer: "", toolUses: [], proposals: [], model: "" });
    await flushPromises();
  });
});

/* -------------------------------------------------------------- chain ---- */

describe("AgentPanel — chain scope", () => {
  it("derives the initial chain from the route", async () => {
    await mountPanel({ open: true, path: "/x/tx/0xabc" });
    const active = q("#agent-panel .agent-chain-btn.tab-btn-active");
    expect(active.getAttribute("data-chain")).toBe("neox");

    await ask("what happened here?");
    expect(serviceMock.askAgent.mock.calls[0][0].chain).toBe("neox");
  });

  it("nudges instead of auto-switching when the route diverges from the pin", async () => {
    const wrapper = await mountPanel({ open: true, path: "/" });
    await ask("hello");
    expect(serviceMock.askAgent.mock.calls[0][0].chain).toBe("n3");

    await router.replace("/x/tx/0xabc");
    await flushPromises();
    await nextTick();

    // Never auto-switch: the pinned scope is still N3.
    expect(q("#agent-panel .agent-chain-btn.tab-btn-active").getAttribute("data-chain")).toBe("n3");
    expect(bodyText()).toContain("Switch this chat?");
    expect(bodyText()).toContain("Neo X");

    buttonByLabel(en.agent.chainSwitchAction).dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();

    expect(q("#agent-panel .agent-chain-btn.tab-btn-active").getAttribute("data-chain")).toBe(
      "neox",
    );
    expect(bodyText()).toContain("Switched to Neo X.");
    expect(wrapper.emitted("close")).toBeFalsy();
  });

  it("keeps the nudge dismissible without changing the scope", async () => {
    await mountPanel({ open: true, path: "/" });
    await ask("hello");
    await router.replace("/x/address/0xabc");
    await flushPromises();
    await nextTick();

    buttonByLabel(en.agent.chainSwitchDismiss).dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();

    expect(bodyText()).not.toContain("Switch this chat?");
    expect(q("#agent-panel .agent-chain-btn.tab-btn-active").getAttribute("data-chain")).toBe("n3");
  });

  it("sends the chain the user picked in the header", async () => {
    await mountPanel({ open: true });
    q('#agent-panel .agent-chain-btn[data-chain="both"]').dispatchEvent(
      new Event("click", { bubbles: true }),
    );
    await nextTick();
    await ask("compare the two networks");
    expect(serviceMock.askAgent.mock.calls[0][0].chain).toBe("both");
  });
});

/* -------------------------------------------------------- suggestions ---- */

describe("AgentPanel — suggestions", () => {
  it("populates the composer and never sends", async () => {
    await mountPanel({ open: true });
    const chip = q("#agent-panel [data-suggestion-id]");
    expect(chip).toBeTruthy();
    const text = chip.textContent.trim();

    chip.dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(q("#agent-panel textarea").value).toBe(text);
    // A one-tap path from a chip to a wallet prompt is prohibited.
    expect(serviceMock.askAgent).not.toHaveBeenCalled();
    expect(document.activeElement.tagName).toBe("TEXTAREA");
  });

  it("hides the suggestions once the conversation starts", async () => {
    await mountPanel({ open: true });
    await ask("hello");
    expect(q("#agent-panel [data-suggestion-id]")).toBeNull();
  });
});

/* -------------------------------------------------------- persistence ---- */

describe("AgentPanel — session persistence", () => {
  it("persists to sessionStorage and never writes a signable payload", async () => {
    serviceMock.askAgent.mockResolvedValue({
      answer: "Here is a transfer.",
      toolUses: ["get_block"],
      proposals: [n3Proposal()],
      model: "claude",
    });
    await mountPanel({ open: true });
    await ask("prepare a transfer");

    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain(GAS_SCRIPT_HASH);
    expect(raw).not.toContain(N3_TO);

    const parsed = JSON.parse(raw);
    expect(parsed.v).toBe(1);
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[1].proposals).toEqual([{ expired: true }]);
  });

  it("restores text but renders zero sign buttons from storage", async () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        chain: "n3",
        explicit: true,
        messages: [
          { id: "m1", role: "user", content: "prepare a transfer" },
          {
            id: "m2",
            role: "assistant",
            content: "Here is a transfer.",
            // A hostile / older payload with a full proposal must still be inert.
            proposals: [n3Proposal()],
          },
        ],
      }),
    );

    await mountPanel({ open: true });

    expect(bodyText()).toContain("prepare a transfer");
    expect(bodyText()).toContain("Here is a transfer.");
    expect(bodyText()).toContain(en.agent.restoredNotice);
    expect(bodyText()).toContain(en.agent.proposalExpired);

    // The one place a UI convenience would become a fund-safety issue.
    expect(document.querySelectorAll(".agent-proposal")).toHaveLength(0);
    expect(bodyText()).not.toContain(en.agent.proposal.sign);
    expect(bodyText()).not.toContain(en.agent.proposal.signAnyway);
  });

  it("still renders a live proposal card for a fresh answer", async () => {
    serviceMock.askAgent.mockResolvedValue({
      answer: "Here is a transfer.",
      toolUses: [],
      proposals: [n3Proposal()],
      model: "",
    });
    const wrapper = await mountPanel({ open: true });
    await ask("prepare a transfer");

    expect(wrapper.findAllComponents(AgentProposalCard)).toHaveLength(1);
    expect(bodyText()).toContain(en.agent.proposal.sign);
    expect(bodyText()).not.toContain(en.agent.proposalExpired);
  });

  it("ignores a payload written by a different version", async () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 99, messages: [{ id: "m1", role: "user", content: "stale" }] }),
    );
    await mountPanel({ open: true });
    expect(bodyText()).not.toContain("stale");
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("survives a corrupt payload", async () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{not json");
    await mountPanel({ open: true });
    expect(panelEl()).toBeTruthy();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears the conversation on New chat and offers a 5s undo", async () => {
    vi.useFakeTimers();
    await mountPanel({ open: true });
    vi.useRealTimers();
    await ask("hello");
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeTruthy();

    buttonByLabel(en.agent.newChat).dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();

    expect(bodyText()).not.toContain("hello");
    expect(bodyText()).toContain(en.agent.newChatCleared);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    buttonByLabel(en.agent.undo).dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(bodyText()).toContain("hello");
    expect(bodyText()).not.toContain(en.agent.newChatCleared);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });

  it("copies the conversation as markdown and announces it", async () => {
    await mountPanel({ open: true });
    await ask("hello");

    buttonByLabel(en.agent.copyTranscript).dispatchEvent(new Event("click", { bubbles: true }));
    await flushPromises();
    await nextTick();

    expect(clipboardMock.copyTextToClipboard).toHaveBeenCalledTimes(1);
    const text = clipboardMock.copyTextToClipboard.mock.calls[0][0];
    expect(text).toContain("**You:**");
    expect(text).toContain("hello");
    expect(q('#agent-panel [role="status"]').textContent.trim()).toBe(en.agent.copyTranscriptDone);
  });
});

/* ------------------------------------------------------------- scroll ---- */

describe("AgentPanel — scroll behaviour", () => {
  it("does not yank a scrolled-up reader and surfaces a New answer pill instead", async () => {
    const pending = deferred();
    serviceMock.askAgent.mockReturnValueOnce(pending.promise);

    await mountPanel({ open: true });
    const state = installScrollMetrics({ scrollHeight: 2000, clientHeight: 400 });

    const textarea = q("#agent-panel textarea");
    textarea.value = "hello";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    q("#agent-panel form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    // The reader scrolls back up while the answer is still in flight.
    state.top = 0;
    q(".agent-transcript").dispatchEvent(new Event("scroll"));
    await nextTick();

    pending.resolve({ answer: "A new answer.", toolUses: [], proposals: [], model: "" });
    await flushPromises();
    await nextTick();

    expect(state.top).toBe(0);
    const pill = q(".agent-new-pill");
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain(en.agent.newMessage);

    pill.dispatchEvent(new Event("click", { bubbles: true }));
    await flushPromises();
    await nextTick();

    expect(state.top).toBe(2000);
    expect(q(".agent-new-pill")).toBeNull();
  });

  it("keeps a pinned reader at the bottom", async () => {
    await mountPanel({ open: true });
    const state = installScrollMetrics({ scrollHeight: 900, clientHeight: 900 });

    await ask("hello");
    expect(state.top).toBe(900);
    expect(q(".agent-new-pill")).toBeNull();
  });
});

/* ------------------------------------------------------ source contract -- */

describe("AgentPanel — source guarantees", () => {
  it("has no HTML sink anywhere in the agent tree", () => {
    expect(panelSource).not.toMatch(/v-html/);
    expect(panelSource).not.toMatch(/innerHTML/);
    expect(panelSource).not.toMatch(/dangerouslySetInnerHTML/);
    expect(panelSource).not.toMatch(/new Function/);
  });

  it("keys the transcript on a stable id, never an index", () => {
    expect(panelSource).toContain(':key="message.id"');
    expect(panelSource).toContain(':key="proposalKey(proposal)"');
    expect(panelSource).not.toMatch(/:key="\s*index\s*"/);
  });

  it("drops the etherscan-card composition and sets the shell directly", () => {
    expect(panelSource).not.toContain("etherscan-card");
    expect(panelSource).toContain("background: var(--surface-elevated)");
    expect(panelSource).toContain("border-left: 1px solid var(--line-soft)");
    expect(panelSource).toContain("box-shadow: -18px 0 48px rgba(17, 35, 63, 0.14)");
    // The header keeps its signature fading underline.
    expect(panelSource).toContain("card-header");
  });

  it("keeps the frozen z-index arrangement", () => {
    expect(panelSource).toMatch(/\.agent-backdrop[\s\S]*?z-index:\s*79/);
    expect(panelSource).toMatch(/\.agent-panel[\s\S]*?z-index:\s*80/);
  });

  it("contains the drawer's own scroll chain", () => {
    expect(panelSource).toContain("overscroll-behavior: contain");
  });

  it("ships dark counterparts and a reduced-motion block", () => {
    expect(panelSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(panelSource).toContain(".dark .agent-panel");
    expect(panelSource).toContain(".dark .agent-chain-btn-active");
    expect(panelSource).toContain(".dark .agent-loading-bubble");
    // Never carry the light-mode white inset hairline into dark.
    expect(panelSource).toContain("rgba(173, 193, 221, 0.05)");
  });

  it("avoids --text-low, literal hex accents and the neutered tracking utilities", () => {
    const style = panelSource.slice(panelSource.indexOf("<style"));
    expect(panelSource).not.toContain("--text-low");
    expect(panelSource).not.toContain("text-low");
    expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(panelSource).not.toMatch(/tracking-(tight|wide|wider|widest)\b/);
    expect(panelSource).not.toContain("bg-surface-base");
    expect(panelSource).not.toContain("bg-surface-muted");
    expect(panelSource).not.toContain("hover:bg-card-hover");
  });

  it("only uses i18n keys from the build contract", () => {
    const allowed = new Set([
      "agent.title",
      "agent.close",
      "agent.intro",
      "agent.thinking",
      "agent.newChat",
      "agent.newChatCleared",
      "agent.undo",
      "agent.copyTranscript",
      "agent.copyTranscriptDone",
      "agent.transcriptLabel",
      "agent.restoredNotice",
      "agent.proposalExpired",
      "agent.chainLabel",
      "agent.chainSwitchPrompt",
      "agent.chainSwitchAction",
      "agent.chainSwitchDismiss",
      "agent.chainChanged",
      "agent.chain.n3",
      "agent.chain.neox",
      "agent.chain.both",
      "agent.workingOnIt",
      "agent.takingLonger",
      "agent.elapsed",
      "agent.newMessage",
      "agent.answerReady",
      "agent.answerReadyWithProposals",
    ]);
    const used = new Set();
    const pattern = /tf\(\s*"([^"]+)"/g;
    let match = pattern.exec(panelSource);
    while (match) {
      used.add(match[1]);
      match = pattern.exec(panelSource);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const key of used) expect(allowed.has(key)).toBe(true);
  });

  it("passes interpolation params through t() instead of patching the result", () => {
    // vue-i18n strips an unsupplied placeholder from a *found* message, so
    // `tf(key, fallback).replace("{chain}", …)` renders an empty slot.
    expect(panelSource).not.toMatch(/tf\([^)]*\)\.replace\(/);
    expect(panelSource).toContain("chain: chainName(routeChain.value)");
    expect(panelSource).toContain("{ chain: chainName(value) }");
    expect(panelSource).toContain('tf("agent.elapsed", "{s}s", { s: elapsedSeconds.value })');
  });

  it("never persists to localStorage or the URL", () => {
    expect(panelSource).not.toContain("localStorage");
    expect(panelSource).toContain("sessionStorage");
    expect(panelSource).not.toContain("history.pushState");
  });
});
