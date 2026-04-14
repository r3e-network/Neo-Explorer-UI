import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const connectedAccount = ref("");
const toastErrorMock = vi.fn();
const toastWarningMock = vi.fn();
const signRawTransactionMock = vi.fn();
const getRawTransactionSigningPayloadMock = vi.fn();
const getPublicKeyMock = vi.fn();
const addMultisigSignatureMock = vi.fn();
const walletSession = vi.hoisted(() => ({
  account: null,
  isConnected: false,
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    addMultisigSignature: addMultisigSignatureMock,
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    PROVIDERS: {
      NEOLINE: "NeoLine",
      WEB3AUTH: "Google / Email (Web3Auth)",
      TESTNET_WIF: "Testnet WIF (Local Dev)",
    },
    signRawTransaction: signRawTransactionMock,
    getRawTransactionSigningPayload: getRawTransactionSigningPayloadMock,
    getPublicKey: getPublicKeyMock,
    get account() {
      return walletSession.account;
    },
    get isConnected() {
      return walletSession.isConnected;
    },
    get provider() {
      return walletSession.account?.label || null;
    },
  },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: toastErrorMock,
    warning: toastWarningMock,
  }),
}));

describe("GovernanceSignModal", () => {
  beforeEach(() => {
    connectedAccount.value = "";
    walletSession.account = null;
    walletSession.isConnected = false;
    signRawTransactionMock.mockReset();
    getRawTransactionSigningPayloadMock.mockReset();
    getPublicKeyMock.mockReset();
    addMultisigSignatureMock.mockReset();
    toastErrorMock.mockReset();
  });

  it.skip("disables wallet signing when no wallet is connected", async () => {
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

  it.skip("shows a reconnect error instead of calling wallet signing when the wallet session is stale", async () => {
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
    expect(wrapper.text()).toContain("tools.governance.offlineSigningGuideTitle");
  });

  it("prepares an offline signing payload and prefills the connected council signer details", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);

    connectedAccount.value = signerAddress;
    walletSession.account = {
      address: signerAddress,
      label: "NeoLine",
    };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue(signerPublicKey);
    getRawTransactionSigningPayloadMock.mockReset();
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    window.Neon = {
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
          })),
        },
      },
    };

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 1,
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: [signerPublicKey],
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

    await flushPromises();

    expect(wrapper.get('[data-testid="governance-sign-modal-external-address"]').element.value).toBe(signerAddress);
    expect(wrapper.get('[data-testid="governance-sign-modal-external-pubkey"]').element.value).toBe(signerPublicKey);

    await wrapper.get('[data-testid="governance-sign-modal-prepare-payload"]').trigger("click");
    await flushPromises();

    expect(getRawTransactionSigningPayloadMock).toHaveBeenCalledWith("001122");
    expect(wrapper.get('[data-testid="governance-sign-modal-signing-payload"]').text()).toContain("3353ef4eabcd");

    delete window.Neon;
  });

  it("builds an external witness from a pasted raw signature", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);

    connectedAccount.value = signerAddress;
    walletSession.account = {
      address: signerAddress,
      label: "NeoLine",
    };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue(signerPublicKey);
    addMultisigSignatureMock.mockReset();
    addMultisigSignatureMock.mockResolvedValue({ success: true, data: [{ id: 1 }] });
    window.Neon = {
      wallet: {
        verify: vi.fn(() => true),
      },
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
          })),
        },
      },
    };
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 7,
          eligible_signers: [signerAddress],
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: [signerPublicKey],
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

    await flushPromises();

    await wrapper.get('[data-testid="governance-sign-modal-external-signature"]').setValue("ab".repeat(64));
    await wrapper.get('[data-testid="governance-sign-modal-submit-witness"]').trigger("click");
    await flushPromises();

    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      7,
      signerAddress,
      "ab".repeat(64),
      expect.objectContaining({
        publicKey: signerPublicKey,
        invocationScript: `0c40${"ab".repeat(64)}`,
        witness: expect.objectContaining({
          signer_address: signerAddress,
          public_key: signerPublicKey,
          invocation_script: `0c40${"ab".repeat(64)}`,
          source: "external_witness",
        }),
      }),
    );

    delete window.Neon;
  });

  it("tries NeoLine signTransaction for multisig council packets and auto-prepares the signing payload if rejected", async () => {
    connectedAccount.value = "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu";
    walletSession.account = {
      address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu",
      label: "NeoLine",
    };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue("");
    signRawTransactionMock.mockReset();
    signRawTransactionMock.mockRejectedValue(new Error("NeoLine rejected: signer mismatch"));
    getRawTransactionSigningPayloadMock.mockReset();
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    toastErrorMock.mockReset();
    toastWarningMock.mockReset();
    window.Neon = {
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
          })),
        },
      },
    };

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

    // Button should be enabled (not preemptively blocked)
    const walletButton = wrapper.findAll("button").find((button) =>
      button.text().includes("tools.governance.signWithWallet")
    );
    expect(walletButton?.attributes("disabled")).toBeUndefined();

    await walletButton?.trigger("click");
    await flushPromises();

    // signTransaction was attempted
    expect(signRawTransactionMock).toHaveBeenCalledWith("001122");
    // Signing payload was auto-prepared for the user
    expect(getRawTransactionSigningPayloadMock).toHaveBeenCalledWith("001122");
    // Warning toast (not error) guides user to the prepared payload
    expect(toastWarningMock).toHaveBeenCalledWith(
      expect.stringContaining("signing payload has been prepared")
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
    // The signing payload should be visible in the component
    expect(wrapper.text()).toContain("3353ef4eabcd");

    delete window.Neon;
  });

  it("accepts NeoLine signTransaction for multisig council packets when NeoLine supports it", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);

    connectedAccount.value = signerAddress;
    walletSession.account = {
      address: signerAddress,
      label: "NeoLine",
    };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue(signerPublicKey);
    signRawTransactionMock.mockReset();
    signRawTransactionMock.mockResolvedValue("cc".repeat(64));
    addMultisigSignatureMock.mockReset();
    addMultisigSignatureMock.mockResolvedValue({ success: true, data: [{ id: 1 }] });
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    window.Neon = {
      wallet: {
        verify: vi.fn(() => true),
      },
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
          })),
        },
      },
    };

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 5,
          eligible_signers: [signerAddress],
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: [signerPublicKey],
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

    await flushPromises();

    const walletButton = wrapper.findAll("button").find((button) =>
      button.text().includes("tools.governance.signWithWallet")
    );
    await walletButton?.trigger("click");
    await flushPromises();

    // signTransaction succeeded - signature was submitted
    expect(signRawTransactionMock).toHaveBeenCalledWith("001122");
    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      5,
      signerAddress,
      "cc".repeat(64),
      expect.objectContaining({
        publicKey: signerPublicKey,
      }),
    );
    expect(toastErrorMock).not.toHaveBeenCalled();

    delete window.Neon;
  });

  it("rejects a raw signature when it does not verify against the governance payload", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);

    connectedAccount.value = signerAddress;
    walletSession.account = {
      address: signerAddress,
      label: "NeoLine",
    };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue(signerPublicKey);
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    window.Neon = {
      wallet: {
        verify: vi.fn(() => false),
      },
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
          })),
        },
      },
    };

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 7,
          eligible_signers: [signerAddress],
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: [signerPublicKey],
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

    await flushPromises();
    await wrapper.get('[data-testid="governance-sign-modal-external-signature"]').setValue("ab".repeat(64));
    await wrapper.get('[data-testid="governance-sign-modal-submit-witness"]').trigger("click");
    await flushPromises();

    expect(addMultisigSignatureMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Failed to submit witness: Signature does not match the governance signing payload for this signer."
    );

    delete window.Neon;
  });
});
