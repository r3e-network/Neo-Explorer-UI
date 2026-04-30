import { mount, config } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

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

    expect(wrapper.text()).toContain("txDetail.headerFailurePrefix");
    expect(wrapper.text()).toContain("ECORE-22");
  });

  it("renders failure reason with explicit red highlight classes", () => {
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

    const reasonNode = wrapper.findAll("p").find((node) => node.text().includes("txDetail.headerFailurePrefix"));
    expect(reasonNode).toBeTruthy();
    expect(reasonNode?.classes() || []).toContain("text-red-700");
    expect(reasonNode?.classes() || []).toContain("bg-red-50");
    expect(reasonNode?.classes() || []).toContain("border-red-300");
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

    expect(wrapper.text()).toContain("txDetail.headerFailurePrefix");
    expect(wrapper.text()).toContain("txDetail.rowFailureReasonEmpty");
  });
});
