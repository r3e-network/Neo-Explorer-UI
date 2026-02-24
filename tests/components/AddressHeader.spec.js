import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import AddressHeader from "@/views/Account/components/AddressHeader.vue";
import { formatTokenAmount } from "@/utils/gasFormat";

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveAddressToNNS: vi.fn().mockResolvedValue(null),
  },
}));

describe("AddressHeader", () => {
  it("formats GAS balance using 8-decimal token units", () => {
    const gasRaw = "1843121006287";
    const wrapper = mount(AddressHeader, {
      props: {
        address: "NQnG5fVqdmA7fP8i3h8awD7QK2TQzW7k34",
        isContract: true,
        showQr: false,
        neoBalance: "0",
        gasBalance: gasRaw,
        txCount: 0,
        tokenCount: 0,
        candidateData: null,
      },
      global: {
        stubs: {
          CopyButton: true,
          QrcodeVue: true,
        },
      },
    });

    const expected = formatTokenAmount(gasRaw, 8, 8);
    expect(wrapper.text()).toContain("GAS Balance");
    expect(wrapper.text()).toContain(expected);
  });
});
