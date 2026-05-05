import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key, params) => {
      if (params && typeof params === "object") {
        return Object.keys(params).reduce(
          (acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k])),
          key,
        );
      }
      return key;
    },
  }),
}));

const connectedAccount = ref("");
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastWarningMock = vi.fn();
const signRawTransactionMock = vi.fn();
const signRawTransactionDetailedMock = vi.fn();
const getRawTransactionSigningPayloadMock = vi.fn();
const getPublicKeyMock = vi.fn();
const addMultisigSignatureMock = vi.fn();
const switchWalletAccountMock = vi.fn();
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
    signRawTransactionDetailed: signRawTransactionDetailedMock,
    getRawTransactionSigningPayload: getRawTransactionSigningPayloadMock,
    getPublicKey: getPublicKeyMock,
    switchWalletAccount: switchWalletAccountMock,
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

vi.mock("@cityofzion/neon-js", () => {
  const runtime = () => globalThis.window?.Neon || {};
  return {
    get default() {
      return runtime();
    },
    get wallet() {
      return runtime().wallet;
    },
    get tx() {
      return runtime().tx;
    },
    get rpc() {
      return runtime().rpc;
    },
    get sc() {
      return runtime().sc;
    },
    get u() {
      return runtime().u;
    },
  };
});

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: toastWarningMock,
    info: vi.fn(),
  }),
}));

describe("GovernanceSignModal", () => {
  beforeEach(() => {
    vi.useRealTimers();
    delete window.Neon;
    connectedAccount.value = "";
    walletSession.account = null;
    walletSession.isConnected = false;
    signRawTransactionMock.mockReset();
    signRawTransactionDetailedMock.mockReset();
    getRawTransactionSigningPayloadMock.mockReset();
    getPublicKeyMock.mockReset();
    addMultisigSignatureMock.mockReset();
    switchWalletAccountMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    delete window.Neon;
    vi.useRealTimers();
  });

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

  it("disables wallet signing when the wallet session is stale (account present but isConnected=false)", async () => {
    connectedAccount.value = "NStaleAddr";
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
    expect(signRawTransactionMock).not.toHaveBeenCalled();
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
    expect(wrapper.text()).toContain("tools.governance.addSignatureOrWitnessLabel");
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

  it("exposes quick actions that jump to the payload and paste-back sections", async () => {
    vi.useFakeTimers();
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
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
          })),
        },
      },
    };

    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      attachTo: document.body,
      props: {
        request: {
          id: 3,
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

    await wrapper.get('[data-testid="governance-sign-modal-jump-to-payload"]').trigger("click");
    await wrapper.get('[data-testid="governance-sign-modal-jump-to-submit"]').trigger("click");
    vi.runAllTimers();
    await flushPromises();

    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(document.activeElement).toBe(wrapper.get('[data-testid="governance-sign-modal-external-signature"]').element);

    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    delete window.Neon;
    wrapper.unmount();
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

  it("accepts a base64 signature in the external witness form", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);
    const signatureHex = "ab".repeat(64);
    const signatureBase64 = Buffer.from(signatureHex, "hex").toString("base64");

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
          id: 8,
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

    await wrapper.get('[data-testid="governance-sign-modal-external-signature"]').setValue(signatureBase64);
    await wrapper.get('[data-testid="governance-sign-modal-submit-witness"]').trigger("click");
    await flushPromises();

    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      8,
      signerAddress,
      signatureHex,
      expect.objectContaining({
        publicKey: signerPublicKey,
        invocationScript: `0c40${signatureHex}`,
      }),
    );

    delete window.Neon;
  });

  it("shows a live signature format hint for valid and invalid pasted signatures", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);
    const signatureHex = "ab".repeat(64);
    const signatureBase64 = Buffer.from(signatureHex, "hex").toString("base64");

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
          id: 11,
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

    await wrapper.get('[data-testid="governance-sign-modal-external-signature"]').setValue(signatureBase64);
    expect(wrapper.get('[data-testid="governance-sign-modal-signature-format-hint"]').text()).toContain("Detected format: Base64 signature");

    await wrapper.get('[data-testid="governance-sign-modal-external-signature"]').setValue("not-a-signature");
    expect(wrapper.get('[data-testid="governance-sign-modal-signature-format-hint"]').text()).toContain("Detected format: Invalid signature input");

    delete window.Neon;
  });

  it("shows NeoLine multisig guide and auto-prepares signing payload when signer mismatch detected", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);

    connectedAccount.value = signerAddress;
    walletSession.account = { address: signerAddress, label: "NeoLine" };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue(signerPublicKey);
    signRawTransactionMock.mockReset();
    getRawTransactionSigningPayloadMock.mockReset();
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    toastErrorMock.mockReset();
    window.Neon = {
      wallet: { Account: class { constructor() { this.address = signerAddress; this.publicKey = signerPublicKey; this.WIF = "test"; } }, sign: vi.fn(() => "cc".repeat(64)), verify: vi.fn(() => true) },
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
        mocks: { $t: (key) => key },
        stubs: { UnsignedTransactionViewer: true },
      },
    });

    await flushPromises();

    // Sign with Wallet button should be disabled (NeoLine mismatch)
    const walletButton = wrapper.findAll("button").find((b) =>
      b.text().includes("tools.governance.signWithWallet")
    );
    expect(walletButton?.attributes("disabled")).toBeDefined();

    // NeoLine guide and signing payload should be visible
    expect(wrapper.text()).toContain("tools.governance.neoLineMismatchHeading");
    // Auto-prepared signing payload should be visible
    expect(getRawTransactionSigningPayloadMock).toHaveBeenCalledWith("001122");
    expect(wrapper.text()).toContain("3353ef4eabcd");

    delete window.Neon;
  });

  it("allows NeoLine signTransaction when the connected wallet is the direct transaction signer", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const signerAddress = publicKeyToAddress(signerPublicKey);

    connectedAccount.value = signerAddress;
    walletSession.account = { address: signerAddress, label: "NeoLine" };
    walletSession.isConnected = true;
    getPublicKeyMock.mockResolvedValue(signerPublicKey);
    signRawTransactionDetailedMock.mockReset();
    signRawTransactionDetailedMock.mockResolvedValue({
      signature: "cc".repeat(64),
      publicKey: signerPublicKey,
      signerAddress,
    });
    addMultisigSignatureMock.mockReset();
    addMultisigSignatureMock.mockResolvedValue({ success: true, data: [{ id: 1 }] });
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    // The tx signer matches the connected wallet — no multisig mismatch
    const { normalizeHash160 } = await import("@/utils/walletNormalization");
    const signerHash = normalizeHash160(signerAddress);
    window.Neon = {
      wallet: { verify: vi.fn(() => true) },
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: signerHash }],
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
        mocks: { $t: (key) => key },
        stubs: { UnsignedTransactionViewer: true },
      },
    });

    await flushPromises();

    const walletButton = wrapper.findAll("button").find((b) =>
      b.text().includes("tools.governance.signWithWallet")
    );
    expect(walletButton?.attributes("disabled")).toBeUndefined();

    await walletButton?.trigger("click");
    await flushPromises();

    expect(signRawTransactionDetailedMock).toHaveBeenCalledWith("001122");
    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      5, signerAddress, "cc".repeat(64),
      expect.objectContaining({ publicKey: signerPublicKey }),
    );
    expect(toastErrorMock).not.toHaveBeenCalled();

    delete window.Neon;
  });

  it("uses the signer metadata returned by NeoLine when the wallet is connected as the committee multisig account", async () => {
    const { publicKeyToAddress } = await import("@/utils/neoHelpers");
    const memberPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const memberAddress = publicKeyToAddress(memberPublicKey);
    const committeeMultisigAddress = "NZqVw6G8PkM5oQJrjX6kN1H5eYc8m4u9Qf";

    connectedAccount.value = committeeMultisigAddress;
    walletSession.account = { address: committeeMultisigAddress, label: "NeoLine" };
    walletSession.isConnected = true;
    signRawTransactionDetailedMock.mockResolvedValue({
      signature: "dd".repeat(64),
      publicKey: memberPublicKey,
      signerAddress: memberAddress,
    });
    addMultisigSignatureMock.mockResolvedValue({ success: true, data: [{ id: 1 }] });
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    const { normalizeHash160 } = await import("@/utils/walletNormalization");
    const multisigHash = normalizeHash160(committeeMultisigAddress);
    window.Neon = {
      wallet: { verify: vi.fn(() => true) },
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: multisigHash }],
          })),
        },
      },
    };

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 6,
          eligible_signers: [memberAddress],
          signers_required: 1,
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: [memberPublicKey],
          },
        },
      },
      global: {
        mocks: { $t: (key) => key },
        stubs: { UnsignedTransactionViewer: true },
      },
    });

    await flushPromises();

    const walletButton = wrapper.findAll("button").find((b) =>
      b.text().includes("tools.governance.signWithWallet")
    );
    await walletButton?.trigger("click");
    await flushPromises();

    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      6,
      memberAddress,
      "dd".repeat(64),
      expect.objectContaining({ publicKey: memberPublicKey }),
    );

    delete window.Neon;
  });

  it("switches NeoLine accounts from the mismatch guide and clears the signer mismatch state", async () => {
    const committeePublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";
    const currentMemberAddress = "Nabc123456789012345678901234567890";
    const committeeMultisigAddress = "NZqVw6G8PkM5oQJrjX6kN1H5eYc8m4u9Qf";

    connectedAccount.value = currentMemberAddress;
    walletSession.account = { address: currentMemberAddress, label: "NeoLine" };
    walletSession.isConnected = true;
    switchWalletAccountMock.mockImplementation(async () => {
      walletSession.account = { address: committeeMultisigAddress, label: "NeoLine" };
      connectedAccount.value = committeeMultisigAddress;
      return walletSession.account;
    });
    getRawTransactionSigningPayloadMock.mockResolvedValue({
      payload: "3353ef4eabcd",
      networkMagic: 860833102,
      transactionHash: "abcd",
    });
    const { normalizeHash160 } = await import("@/utils/walletNormalization");
    const multisigHash = normalizeHash160(committeeMultisigAddress);
    window.Neon = {
      wallet: {
        Account: {
          createMultiSig: vi.fn(() => ({ address: committeeMultisigAddress })),
        },
      },
      tx: {
        Transaction: {
          deserialize: vi.fn(() => ({
            signers: [{ account: multisigHash }],
          })),
        },
      },
    };

    const GovernanceSignModal = (await import("@/views/Tools/components/GovernanceSignModal.vue")).default;
    const wrapper = mount(GovernanceSignModal, {
      props: {
        request: {
          id: 9,
          signers_required: 1,
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: [committeePublicKey],
          },
        },
      },
      global: {
        mocks: { $t: (key) => key },
        stubs: { UnsignedTransactionViewer: true },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("tools.governance.neoLineMismatchHeading");

    await wrapper.get('[data-testid="governance-sign-modal-switch-neoline-account"]').trigger("click");
    await flushPromises();

    expect(switchWalletAccountMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith("tools.governance.signModalToasts.neoLineSwitchedSuccess");

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
      "tools.governance.signModalToasts.submitWitnessFailed"
    );

    delete window.Neon;
  });
});
