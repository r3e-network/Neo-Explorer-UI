import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const connectedAccount = ref("");
const toastErrorMock = vi.fn();
const signRawTransactionMock = vi.fn();
const walletSession = vi.hoisted(() => ({
  account: null,
  isConnected: false,
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    addMultisigSignature: vi.fn(),
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    signRawTransaction: signRawTransactionMock,
    get account() {
      return walletSession.account;
    },
    get isConnected() {
      return walletSession.isConnected;
    },
  },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: toastErrorMock,
  }),
}));

describe("GovernanceSignModal", () => {
  it("disables wallet signing when no wallet is connected", async () => {
    connectedAccount.value = "";
    walletSession.account = null;
    walletSession.isConnected = false;

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 1,
          params: {
            unsigned_tx: "001122",
          },
        },
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          UnsignedTransactionViewer: true,
        },
      },
    });

    const walletButton = wrapper.findAll("button").find((button) =>
      button.text().includes("tools.governance.signWithWallet")
    );

    expect(walletButton?.attributes("disabled")).toBeDefined();
  });

  it("shows a reconnect error instead of calling wallet signing when the wallet session is stale", async () => {
    connectedAccount.value = "NStaleAddr";
    walletSession.account = null;
    walletSession.isConnected = false;
    signRawTransactionMock.mockReset();
    toastErrorMock.mockReset();

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 1,
          params: {
            unsigned_tx: "001122",
          },
        },
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          UnsignedTransactionViewer: true,
        },
      },
    });

    const walletButton = wrapper.findAll("button").find((button) =>
      button.text().includes("tools.governance.signWithWallet")
    );
    await walletButton?.trigger("click");

    expect(signRawTransactionMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Signing failed: Wallet session expired. Reconnect wallet and try again.");
  });

  it("uses a custom test id prefix when one is provided", async () => {
    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 1,
          params: {
            unsigned_tx: "001122",
          },
        },
        testIdPrefix: "governance-detail-sign-modal",
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          UnsignedTransactionViewer: true,
        },
      },
    });

    expect(wrapper.get('[data-testid="governance-detail-sign-modal-overlay"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="governance-detail-sign-modal-panel"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="governance-detail-sign-modal-body"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="governance-sign-modal-overlay"]').exists()).toBe(false);
  });
});
