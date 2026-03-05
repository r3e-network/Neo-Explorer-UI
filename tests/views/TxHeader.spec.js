import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TxHeader from "@/views/Transaction/components/TxHeader.vue";

describe("TxHeader", () => {
  it("shows failure reason inline when transaction failed", () => {
    const wrapper = mount(TxHeader, {
      props: {
        isSuccess: false,
        txStatus: "failed",
        failureReason: "ABORTMSG is executed. Reason: ECORE-22",
      },
      global: {
        stubs: {
          StatusBadge: {
            name: "StatusBadge",
            props: ["status"],
            template: "<span>{{ status }}</span>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Failure Reason:");
    expect(wrapper.text()).toContain("ECORE-22");
  });

  it("shows fallback text when failed without explicit reason", () => {
    const wrapper = mount(TxHeader, {
      props: {
        isSuccess: false,
        txStatus: "failed",
        failureReason: "",
      },
      global: {
        stubs: {
          StatusBadge: {
            name: "StatusBadge",
            props: ["status"],
            template: "<span>{{ status }}</span>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Failure Reason:");
    expect(wrapper.text()).toContain("No exception detail returned by node");
  });
});
