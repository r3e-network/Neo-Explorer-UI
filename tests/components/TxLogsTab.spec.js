import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("TxLogsTab", () => {
  it("renders stack results with the StackViewer instead of raw JSON", async () => {
    const component = (await import("@/views/Transaction/components/TxLogsTab.vue")).default;

    const wrapper = mount(component, {
      props: {
        appLog: {
          executions: [
            {
              trigger: "Application",
              vmstate: "HALT",
              gasconsumed: "0.00215925",
              stack: [{ type: "Boolean", value: true }],
              notifications: [],
            },
          ],
        },
        appLogLoading: false,
        appLogError: "",
        showRawAppLog: false,
        enrichedTrace: null,
      },
      global: {
        stubs: {
          HashLink: { template: "<span><slot /></span>" },
        },
      },
    });

    expect(wrapper.text()).toContain("Stack Result");
    expect(wrapper.text()).toContain("Boolean");
    expect(wrapper.text()).toContain("true");
    expect(wrapper.text()).not.toContain('"type": "Boolean"');
  });
});
