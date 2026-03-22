import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const connectedAccount = ref("");

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
    signRawTransaction: vi.fn(),
  },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("GovernanceSignModal", () => {
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
