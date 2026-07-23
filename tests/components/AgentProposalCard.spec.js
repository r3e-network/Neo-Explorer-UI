import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// tf(key, fallback) returns the fallback only when t() echoes the key back, so
// a marker translation lets every assertion name the exact key in play.
const i18nMock = vi.hoisted(() => ({ t: vi.fn((key) => `T[${key}]`) }));

// Partial mock: the real router drags in views that build the app-wide i18n
// instance, so `createI18n` and friends must stay intact.
vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useI18n: () => ({ t: i18nMock.t }) };
});

const signerMock = vi.hoisted(() => ({ signProposal: vi.fn() }));

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

import AgentProposalCard from "@/components/agent/AgentProposalCard.vue";
import cardSource from "@/components/agent/AgentProposalCard.vue?raw";
import CopyButton from "@/components/common/CopyButton.vue";
import realRouter from "@/router";

const T = (key) => `T[${key}]`;

const GAS_SCRIPT_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const N3_FROM = "NgebdUkFxSbzLMruXopuBw4aKsXX8sTyxw";
const N3_TO = "Naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const N3_TXID = "0x9c2fb2c04d6d4bb0d0f56b1b0f89a09c96f0c86e5d3a5c1f1e6a1b2c3d4e5f60";

const EVM_FROM = "0xabcdef0123456789abcdef0123456789abcdef01";
const EVM_TO = "0x1234567890123456789012345678901234567890";
const SPENDER = "0x1111111111111111111111111111111111111111";
const NEOX_TX_HASH = "0x5f4dcc3b5aa765d61d8327deb882cf99b1c2d3e4f50617283940a1b2c3d4e5f6";
// approve(spender, 2**256-1) — the deterministic analyzer flags this `danger`.
const UNLIMITED_APPROVE_DATA = `0x095ea7b3${"0".repeat(24)}${SPENDER.slice(2)}${"f".repeat(64)}`;

const wrappers = [];

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

function neoxProposal(tx = {}, overrides = {}) {
  return {
    chain: "neox",
    kind: "eth_tx",
    summary: "Send 1 GAS on Neo X.",
    network: "mainnet",
    tx: {
      from: EVM_FROM,
      to: EVM_TO,
      value: "1000000000000000000",
      gas: "0x5208",
      data: "0x",
      ...tx,
    },
    ...overrides,
  };
}

function dangerProposal() {
  return neoxProposal({ value: "0x0", data: UNLIMITED_APPROVE_DATA }, {
    summary: "Approve unlimited spending.",
  });
}

function mountCard(proposal) {
  const wrapper = mount(AgentProposalCard, {
    props: { proposal },
    global: {
      mocks: { $t: (key) => key },
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

// The app mounts everything under a layout route that itself redirects "/",
// so only the leaf record tells us whether the target is a real page.
function leafRedirect(resolved) {
  return resolved.matched[resolved.matched.length - 1]?.redirect;
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

function signButton(wrapper) {
  return wrapper.find("button.btn-primary");
}

function retryButton(wrapper) {
  return wrapper.find(".agent-sign-error .btn-outline");
}

function receiptLink(wrapper) {
  const links = wrapper.findAllComponents(RouterLinkStub);
  const inReceipt = links.filter((link) => link.element.closest(".agent-receipt"));
  return inReceipt[0] || null;
}

async function signAndResolve(wrapper, result) {
  signerMock.signProposal.mockResolvedValueOnce(result);
  await signButton(wrapper).trigger("click");
  await flushPromises();
}

async function signAndReject(wrapper, error) {
  signerMock.signProposal.mockRejectedValueOnce(error);
  await signButton(wrapper).trigger("click");
  await flushPromises();
}

function errorWith(props) {
  const error = new Error(props.message || "boom");
  Object.assign(error, props);
  return error;
}

describe("AgentProposalCard", () => {
  beforeEach(() => {
    i18nMock.t.mockReset();
    i18nMock.t.mockImplementation((key) => `T[${key}]`);
    signerMock.signProposal.mockReset();
  });

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  describe("success links resolve to named routes (BUG: /transaction is a redirect)", () => {
    it("links an N3 receipt to /transaction-info/:txhash, never /transaction/:id", async () => {
      const wrapper = mountCard(n3Proposal());
      await signAndResolve(wrapper, { chain: "n3", txid: N3_TXID });

      const link = receiptLink(wrapper);
      expect(link).not.toBeNull();
      expect(link.props("to")).toBe(`/transaction-info/${N3_TXID}`);
      expect(link.props("to").startsWith("/transaction/")).toBe(false);
    });

    it("resolves the N3 receipt target to a named route with no redirect record", async () => {
      const wrapper = mountCard(n3Proposal());
      await signAndResolve(wrapper, { chain: "n3", txid: N3_TXID });

      const resolved = realRouter.resolve(receiptLink(wrapper).props("to"));
      expect(resolved.name).toBe("transactionDetail");
      expect(resolved.matched.length).toBeGreaterThan(0);
      expect(leafRedirect(resolved)).toBeFalsy();
    });

    it("proves the old target was broken: /transaction/:id is not a detail route", () => {
      const resolved = realRouter.resolve(`/transaction/${N3_TXID}`);
      expect(resolved.name).not.toBe("transactionDetail");
    });

    it("keeps /x/tx/:txhash for Neo X and resolves it to a named route", async () => {
      const wrapper = mountCard(neoxProposal());
      await signAndResolve(wrapper, { chain: "neox", txHash: NEOX_TX_HASH });

      const link = receiptLink(wrapper);
      expect(link.props("to")).toBe(`/x/tx/${NEOX_TX_HASH}`);

      const resolved = realRouter.resolve(link.props("to"));
      expect(resolved.name).toBe("xTxDetail");
      expect(leafRedirect(resolved)).toBeFalsy();
    });

    it("labels the receipt link and offers a sm copy button for the hash", async () => {
      const wrapper = mountCard(n3Proposal());
      await signAndResolve(wrapper, { chain: "n3", txid: N3_TXID });

      const link = receiptLink(wrapper);
      expect(link.attributes("aria-label")).toBe(T("agent.proposal.viewTx"));
      expect(link.classes()).toContain("min-w-0");
      expect(link.classes()).toContain("truncate");

      const receiptCopy = wrapper
        .findAllComponents(CopyButton)
        .filter((copy) => copy.element.closest(".agent-receipt"));
      expect(receiptCopy).toHaveLength(1);
      expect(receiptCopy[0].props("text")).toBe(N3_TXID);
      expect(receiptCopy[0].props("size")).toBe("sm");
      expect(receiptCopy[0].attributes("aria-label")).toBe(T("agent.proposal.copyTx"));
    });
  });

  describe("pending state", () => {
    it("lands in an honest pending state, not a confirmed success", async () => {
      const wrapper = mountCard(n3Proposal());
      await signAndResolve(wrapper, { chain: "n3", txid: N3_TXID });

      expect(wrapper.find(".agent-receipt-pending").exists()).toBe(true);
      expect(wrapper.find(".agent-receipt-done").exists()).toBe(false);
      expect(wrapper.text()).toContain(T("agent.proposal.pending"));
      expect(wrapper.text()).not.toContain(T("agent.proposal.success"));
      expect(wrapper.find(".agent-receipt .animate-spin").exists()).toBe(true);
    });

    it("replaces the sign action once the wallet has broadcast", async () => {
      const wrapper = mountCard(n3Proposal());
      await signAndResolve(wrapper, { chain: "n3", txid: N3_TXID });

      expect(signButton(wrapper).exists()).toBe(false);
    });
  });

  describe("stale-state bleed", () => {
    it("resets sign state when the proposal prop changes", async () => {
      const wrapper = mountCard(n3Proposal());
      await signAndResolve(wrapper, { chain: "n3", txid: N3_TXID });
      expect(wrapper.find(".agent-receipt").exists()).toBe(true);

      await wrapper.setProps({ proposal: n3Proposal({ summary: "A different transfer." }) });
      await flushPromises();

      expect(wrapper.find(".agent-receipt").exists()).toBe(false);
      expect(signButton(wrapper).exists()).toBe(true);
      expect(wrapper.find(".agent-sign-error").exists()).toBe(false);
      expect(wrapper.text()).toContain("A different transfer.");
    });

    it("resets an error state and the danger acknowledgement when the proposal changes", async () => {
      const wrapper = mountCard(dangerProposal());
      await wrapper.find("input[type=checkbox]").setValue(true);
      await signAndReject(wrapper, errorWith({ message: "wallet exploded" }));
      expect(wrapper.find(".agent-sign-error").exists()).toBe(true);

      await wrapper.setProps({ proposal: dangerProposal() });
      await flushPromises();

      expect(wrapper.find(".agent-sign-error").exists()).toBe(false);
      expect(wrapper.find("input[type=checkbox]").element.checked).toBe(false);
      expect(signButton(wrapper).attributes("disabled")).toBeDefined();
    });
  });

  describe("danger gate", () => {
    it("cannot reach the wallet without acknowledging the danger flag", async () => {
      const wrapper = mountCard(dangerProposal());

      const button = signButton(wrapper);
      expect(button.attributes("disabled")).toBeDefined();

      await button.trigger("click");
      expect(signerMock.signProposal).not.toHaveBeenCalled();

      // Defense in depth: even if the disabled attribute is defeated in the
      // DOM, the handler itself must refuse to call the signer.
      button.element.removeAttribute("disabled");
      button.element.disabled = false;
      await button.trigger("click");
      await flushPromises();
      expect(signerMock.signProposal).not.toHaveBeenCalled();
    });

    it("enables the destructive CTA only after the checkbox is ticked", async () => {
      const wrapper = mountCard(dangerProposal());

      const checkbox = wrapper.find("input[type=checkbox]");
      expect(checkbox.exists()).toBe(true);
      expect(wrapper.text()).toContain(T("agent.proposal.dangerAck"));

      await checkbox.setValue(true);
      expect(signButton(wrapper).attributes("disabled")).toBeUndefined();

      signerMock.signProposal.mockResolvedValueOnce({ chain: "neox", txHash: NEOX_TX_HASH });
      await signButton(wrapper).trigger("click");
      await flushPromises();
      expect(signerMock.signProposal).toHaveBeenCalledTimes(1);
    });

    it("restyles and relabels the CTA as destructive", () => {
      const wrapper = mountCard(dangerProposal());

      const button = signButton(wrapper);
      expect(button.classes()).toContain("agent-sign-danger");
      expect(button.text()).toContain(T("agent.proposal.signAnyway"));
    });

    it("moves the danger flag above the summary", () => {
      const wrapper = mountCard(dangerProposal());

      const dangerList = wrapper.find(".agent-flag-list").element;
      const summary = Array.from(wrapper.element.querySelectorAll("p")).find((node) =>
        node.textContent.includes("Approve unlimited spending."),
      );
      expect(summary).toBeTruthy();
      expect(dangerList.textContent).toContain(T("agent.flag.unlimited_approval"));
      // DOCUMENT_POSITION_FOLLOWING === 4: the summary comes after the flag.
      expect(dangerList.compareDocumentPosition(summary) & 4).toBe(4);
    });

    it("leaves warn/info flows without a gate", () => {
      const wrapper = mountCard(
        neoxProposal({ value: "100000000000000000000", data: "0x" }),
      );

      expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);
      expect(signButton(wrapper).attributes("disabled")).toBeUndefined();
      expect(signButton(wrapper).classes()).not.toContain("agent-sign-danger");
      expect(signButton(wrapper).text()).toContain(T("agent.proposal.sign"));
      expect(wrapper.text()).toContain(T("agent.flag.large_transfer"));
    });
  });

  describe("typed signer errors", () => {
    it("no_provider renders the wallet help and no retry button", async () => {
      const wrapper = mountCard(neoxProposal());
      await signAndReject(wrapper, errorWith({ code: "no_provider", message: "no wallet" }));

      expect(wrapper.text()).toContain(T("agent.proposal.noWallet"));
      expect(wrapper.text()).toContain(T("agent.proposal.noWalletHelp"));
      expect(retryButton(wrapper).exists()).toBe(false);
      expect(wrapper.find(".agent-sign-error details").exists()).toBe(false);
    });

    it("invalid_proposal renders no retry button", async () => {
      const wrapper = mountCard(neoxProposal());
      await signAndReject(wrapper, errorWith({ code: "invalid_proposal", message: "bad shape" }));

      expect(wrapper.text()).toContain(T("agent.proposal.invalid"));
      expect(retryButton(wrapper).exists()).toBe(false);
    });

    it("a user rejection stays muted and keeps the retry affordance", async () => {
      const wrapper = mountCard(neoxProposal());
      await signAndReject(wrapper, errorWith({ userRejected: true, code: 4001, message: "denied" }));

      expect(wrapper.text()).toContain(T("agent.proposal.cancelled"));
      expect(wrapper.find(".agent-sign-error").classes()).toContain("text-mid");
      expect(retryButton(wrapper).exists()).toBe(true);
      expect(wrapper.find(".agent-sign-error details").exists()).toBe(false);
    });

    it("a real failure retries and discloses the raw message in a details block", async () => {
      const wrapper = mountCard(neoxProposal());
      await signAndReject(wrapper, errorWith({ message: "RPC -32000: insufficient funds" }));

      expect(wrapper.text()).toContain(T("agent.proposal.failed"));
      expect(wrapper.find(".agent-sign-error").classes()).toContain("text-status-error");
      expect(retryButton(wrapper).exists()).toBe(true);

      const details = wrapper.find(".agent-sign-error details");
      expect(details.exists()).toBe(true);
      expect(details.find("summary").text()).toBe(T("agent.proposal.errorDetails"));
      expect(details.find(".font-hash").text()).toBe("RPC -32000: insufficient funds");
    });

    it("retrying calls the signer again", async () => {
      const wrapper = mountCard(neoxProposal());
      await signAndReject(wrapper, errorWith({ message: "transient" }));

      signerMock.signProposal.mockResolvedValueOnce({ chain: "neox", txHash: NEOX_TX_HASH });
      await retryButton(wrapper).trigger("click");
      await flushPromises();

      expect(signerMock.signProposal).toHaveBeenCalledTimes(2);
      expect(wrapper.find(".agent-receipt").exists()).toBe(true);
    });
  });

  describe("non-custodial footnote", () => {
    it("renders in idle, signing, pending and error states", async () => {
      const wrapper = mountCard(n3Proposal());
      expect(wrapper.find(".agent-footnote").text()).toBe(T("agent.proposal.neverSigns"));

      const pendingSign = deferred();
      signerMock.signProposal.mockReturnValueOnce(pendingSign.promise);
      await signButton(wrapper).trigger("click");
      expect(wrapper.find(".agent-footnote").exists()).toBe(true);
      expect(signButton(wrapper).text()).toContain(T("agent.proposal.signing"));

      pendingSign.resolve({ chain: "n3", txid: N3_TXID });
      await flushPromises();
      expect(wrapper.find(".agent-footnote").exists()).toBe(true);

      const errorWrapper = mountCard(n3Proposal());
      await signAndReject(errorWrapper, errorWith({ message: "nope" }));
      expect(errorWrapper.find(".agent-footnote").exists()).toBe(true);
    });
  });

  describe("layout & consistency", () => {
    it("truncates, titles, links and copies every N3 hash-like value", () => {
      const wrapper = mountCard(n3Proposal());

      const links = wrapper.findAllComponents(RouterLinkStub);
      const targets = links.map((link) => link.props("to"));
      expect(targets).toContain(`/contract-info/${GAS_SCRIPT_HASH}`);
      expect(targets).toContain(`/account-profile/${N3_FROM}`);
      expect(targets).toContain(`/account-profile/${N3_TO}`);

      links.forEach((link) => {
        expect(link.classes()).toContain("min-w-0");
        expect(link.attributes("title")).toBeTruthy();
        // The visible label is middle-truncated, never the raw 34/42 chars.
        expect(link.text().length).toBeLessThan(link.attributes("title").length);
      });

      const copyTexts = wrapper.findAllComponents(CopyButton).map((copy) => copy.props("text"));
      expect(copyTexts).toContain(GAS_SCRIPT_HASH);
      expect(copyTexts).toContain(N3_FROM);
      expect(copyTexts).toContain(N3_TO);
    });

    it("resolves the N3 address and contract links to named routes", () => {
      const wrapper = mountCard(n3Proposal());
      const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props("to"));

      expect(realRouter.resolve(`/contract-info/${GAS_SCRIPT_HASH}`).name).toBe("contractDetail");
      expect(realRouter.resolve(`/account-profile/${N3_FROM}`).name).toBe("accountProfile");
      targets.forEach((target) => {
        const resolved = realRouter.resolve(target);
        expect(resolved.name).toBeTruthy();
        expect(leafRedirect(resolved)).toBeFalsy();
      });
    });

    it("never links a value whose shape it cannot identify", () => {
      const wrapper = mountCard(
        n3Proposal({
          scriptHash: "not-a-hash",
          args: [
            { type: "Hash160", value: "not-an-address" },
            { type: "Hash160", value: "also-not-an-address" },
            { type: "Integer", value: "1" },
          ],
        }),
      );

      expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);
      // Still selectable and copyable — no link beats a wrong link.
      const copyTexts = wrapper.findAllComponents(CopyButton).map((copy) => copy.props("text"));
      expect(copyTexts).toContain("not-an-address");
    });

    it("uses size=sm for every copy button and never xs", () => {
      const wrapper = mountCard(n3Proposal());
      const copies = wrapper.findAllComponents(CopyButton);

      expect(copies.length).toBeGreaterThan(0);
      copies.forEach((copy) => {
        expect(copy.props("size")).toBe("sm");
        // The scope id lands on the child root, so `.agent-copy` lifts the
        // 22px sm button to the 24px WCAG 2.2 SC 2.5.8 floor.
        expect(copy.classes()).toContain("agent-copy");
      });
      expect(cardSource).not.toMatch(/size="xs"/);
      expect(cardSource).toMatch(/\.agent-copy \{[^}]*min-width: 1\.5rem;[^}]*min-height: 1\.5rem;/);
    });

    it("keeps the Neo X copy buttons at sm as well", () => {
      const wrapper = mountCard(neoxProposal({ data: UNLIMITED_APPROVE_DATA }));
      const copies = wrapper.findAllComponents(CopyButton);

      expect(copies.length).toBeGreaterThan(0);
      copies.forEach((copy) => {
        expect(copy.props("size")).toBe("sm");
        expect(copy.classes()).toContain("agent-copy");
      });
    });

    it("stacks the key/value rows on narrow viewports and tints labels with --text-mid", () => {
      expect(cardSource).toMatch(/@media \(max-width: 420px\)/);
      expect(cardSource).toMatch(/flex: 0 0 6\.5rem/);
      expect(cardSource).toMatch(/\.agent-kv-label \{[^}]*color: var\(--text-mid\)/);
      expect(cardSource).not.toMatch(/agent-kv-label[\s\S]{0,80}var\(--text-low\)/);
    });
  });

  describe("flag list", () => {
    it("labels the list and gives every level the same border box", () => {
      const wrapper = mountCard(dangerProposal());

      wrapper.findAll("ul.agent-flag-list").forEach((list) => {
        expect(list.attributes("aria-label")).toBe(T("agent.proposal.warningsLabel"));
      });
      expect(cardSource).toMatch(/border: 1px solid transparent/);
    });

    it("demotes info flags to muted inline text", () => {
      const wrapper = mountCard(neoxProposal());

      const info = wrapper.find(".agent-flag-info");
      expect(info.exists()).toBe(true);
      expect(info.classes()).toContain("text-mid");
      expect(info.classes()).not.toContain("bg-status-warning-bg");
      expect(info.classes()).not.toContain("bg-status-error-bg");
      expect(info.text()).toContain(T("agent.flag.unlabeled_recipient"));
    });

    it("boxes warn flags with the warning tokens", () => {
      const wrapper = mountCard(neoxProposal({ value: "100000000000000000000" }));

      const warn = wrapper
        .findAll("li.agent-flag")
        .find((item) => item.text().includes(T("agent.flag.large_transfer")));
      expect(warn.classes()).toContain("bg-status-warning-bg");
      expect(warn.classes()).toContain("text-status-warning");
    });

    it("renders no flag list at all when the analyzer is silent", () => {
      const wrapper = mountCard(
        n3Proposal({
          args: [
            { type: "Hash160", value: N3_FROM },
            { type: "Hash160", value: N3_FROM },
            { type: "Integer", value: "1" },
          ],
        }),
      );

      expect(wrapper.find(".agent-flag-list").exists()).toBe(false);
    });
  });

  describe("micro fixes", () => {
    it("drops the dead disabled:opacity-70 utility", () => {
      expect(cardSource).not.toContain("disabled:opacity-70");
    });

    it("neutralizes the detail-chip hover on the non-interactive chain chip", () => {
      const wrapper = mountCard(n3Proposal());

      expect(wrapper.find(".agent-chain-chip").exists()).toBe(true);
      expect(cardSource).toMatch(/\.agent-chip-n3:hover/);
      expect(cardSource).toMatch(/\.agent-chip-neox:hover/);
    });

    it("hides the Neo X value row when there is nothing to send", () => {
      const zero = mountCard(neoxProposal({ value: "0x0", data: UNLIMITED_APPROVE_DATA }));
      expect(zero.text()).not.toContain(T("agent.proposal.value"));

      const nonZero = mountCard(neoxProposal());
      expect(nonZero.text()).toContain(T("agent.proposal.value"));
      expect(nonZero.text()).toContain(T("agent.proposal.valueUnit"));
    });

    it("sources the chain dot from the shared chain tokens, not literal hex", () => {
      const n3 = mountCard(n3Proposal());
      const neox = mountCard(neoxProposal());

      expect(n3.find(".agent-chain-chip span[aria-hidden]").attributes("style")).toContain(
        "var(--chain-n3)",
      );
      expect(neox.find(".agent-chain-chip span[aria-hidden]").attributes("style")).toContain(
        "var(--chain-neox)",
      );
      expect(cardSource).not.toContain("#00e599");
      expect(cardSource).not.toContain("#7c5cff");
      expect(cardSource).toMatch(/var\(--chain-n3\)/);
      expect(cardSource).toMatch(/var\(--chain-neox\)/);
    });

    it("avoids the neutered named tracking utilities", () => {
      expect(cardSource).not.toMatch(/tracking-(tight|wide|wider|widest)\b/);
    });
  });

  describe("theming, motion and safety", () => {
    it("ships explicit dark rules for every bespoke surface", () => {
      expect(cardSource).toMatch(/\.dark \.agent-receipt-pending/);
      expect(cardSource).toMatch(/\.dark \.agent-receipt-done/);
    });

    it("ships a component-local reduced-motion block", () => {
      expect(cardSource).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
      expect(cardSource).toMatch(/\.animate-spin \{\s*animation: none;/);
    });

    it("never renders untrusted content through an HTML string stage", () => {
      expect(cardSource).not.toMatch(/v-html|innerHTML|dangerouslySetInnerHTML|new Function/);
    });

    it("renders model-authored summaries as literal text", () => {
      const wrapper = mountCard(
        n3Proposal({ summary: "<script>alert(1)</script><img src=x onerror=alert(2)>" }),
      );

      expect(wrapper.text()).toContain("<script>alert(1)</script>");
      expect(wrapper.find("script").exists()).toBe(false);
      expect(wrapper.find("img").exists()).toBe(false);
    });
  });

  describe("i18n fallbacks", () => {
    it("renders English defaults when the locale has no agent keys", () => {
      i18nMock.t.mockImplementation((key) => key);
      const wrapper = mountCard(n3Proposal());

      expect(wrapper.find(".agent-footnote").text()).toBe(
        "The AI never signs — this is signed by your wallet.",
      );
      expect(signButton(wrapper).text()).toContain("Review & sign in your wallet");
      expect(wrapper.text()).not.toContain("agent.proposal.");
    });
  });
});
