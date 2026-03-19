import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/CopyButton.vue", () => ({
  default: {
    name: "CopyButton",
    props: ["text"],
    template: '<button data-testid="copy-button" :data-text="text">copy</button>',
  },
}));

vi.mock("@/components/trace/ScriptViewer.vue", () => ({
  default: {
    name: "ScriptViewer",
    props: ["script", "label"],
    template: '<div data-testid="script-viewer">{{ label }}:{{ script }}</div>',
  },
}));

describe("UnsignedTransactionViewer", () => {
  const unsignedTx =
    "003597616f2810020000000000aa000b00000000002f2b8a0001862bce11c9003401ccd69825229e6821e6cfef2880006d01b80b11c01b0c177365744d696c6c697365636f6e6473506572426c6f636b0c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b520200e1f50511c0130c0e736574476173506572426c6f636b0c14f563ea40bc283d4d0e05c48ea305b3f2a07340ef41627d5b52";

  it("renders a decoded unsigned transaction summary and embedded script", async () => {
    const UnsignedTransactionViewer = (await import("@/components/trace/UnsignedTransactionViewer.vue")).default;
    const wrapper = mount(UnsignedTransactionViewer, {
      props: {
        transactionHex: unsignedTx,
        label: "Unsigned Transaction",
      },
    });

    expect(wrapper.text()).toContain("Transaction Envelope");
    expect(wrapper.text()).toContain("Version");
    expect(wrapper.text()).toContain("9,055,023");
    expect(wrapper.text()).toContain("Global");
    expect(wrapper.text()).toContain("0.00135208 GAS");
    expect(wrapper.find('[data-testid="script-viewer"]').exists()).toBe(true);
  });

  it("uses high-contrast theme text for the header copy on light surfaces", async () => {
    const UnsignedTransactionViewer = (await import("@/components/trace/UnsignedTransactionViewer.vue")).default;
    const wrapper = mount(UnsignedTransactionViewer, {
      props: {
        transactionHex: unsignedTx,
        label: "Unsigned Transaction Packet",
        description: "The full transaction envelope council wallets sign, including fees, signer scopes, and the embedded execution script.",
      },
    });

    expect(wrapper.get('[data-testid="unsigned-tx-header-label"]').classes()).toContain("text-high");
    expect(wrapper.get('[data-testid="unsigned-tx-header-description"]').classes()).toContain("text-mid");
  });

  it("uses light-surface containers by default instead of forcing dark blocks", async () => {
    const UnsignedTransactionViewer = (await import("@/components/trace/UnsignedTransactionViewer.vue")).default;
    const wrapper = mount(UnsignedTransactionViewer, {
      props: {
        transactionHex: unsignedTx,
      },
    });

    expect(wrapper.get('[data-testid="unsigned-tx-shell"]').classes()).toContain("bg-surface-muted/60");
    expect(wrapper.get('[data-testid="unsigned-tx-shell"]').classes()).not.toContain("bg-[#020617]");
    expect(wrapper.get('[data-testid="unsigned-tx-shell"]').classes()).not.toContain("dark");
    await wrapper.get('[data-testid="unsigned-tx-toggle"]').trigger("click");
    expect(wrapper.get('[data-testid="unsigned-tx-raw"]').classes()).toContain("bg-surface");
  });

  it("keeps the raw hex view copyable", async () => {
    const UnsignedTransactionViewer = (await import("@/components/trace/UnsignedTransactionViewer.vue")).default;
    const wrapper = mount(UnsignedTransactionViewer, {
      props: {
        transactionHex: unsignedTx,
      },
    });

    await wrapper.get('[data-testid="unsigned-tx-toggle"]').trigger("click");

    expect(wrapper.get('[data-testid="unsigned-tx-raw"]').text()).toContain(unsignedTx);
    expect(wrapper.get('[data-testid="copy-button"]').attributes("data-text")).toBe(unsignedTx);
  });
});
