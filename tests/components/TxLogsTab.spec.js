import { mount, config } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

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

    expect(wrapper.text()).toContain("blockDetail.logsStackResult");
    expect(wrapper.text()).toContain("Boolean");
    expect(wrapper.text()).toContain("true");
    expect(wrapper.text()).not.toContain('"type": "Boolean"');
  });

  it("falls back to raw notifications when the enriched trace has no operations", async () => {
    const component = (await import("@/views/Transaction/components/TxLogsTab.vue")).default;

    const wrapper = mount(component, {
      props: {
        appLog: {
          executions: [
            {
              trigger: "Application",
              vmstate: "HALT",
              gasconsumed: "0.00215925",
              stack: [],
              notifications: [
                {
                  contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
                  eventname: "Transfer",
                  state: { type: "Array", value: [] },
                },
              ],
            },
          ],
        },
        appLogLoading: false,
        appLogError: "",
        showRawAppLog: false,
        enrichedTrace: { executions: [{ operations: [] }] },
      },
      global: {
        stubs: {
          HashLink: { props: ["hash"], template: "<span>{{ hash }}</span>" },
        },
      },
    });

    expect(wrapper.text()).toContain("Transfer");
    expect(wrapper.text()).toContain("0xd2a4cff31913016155e38e474a2c06d08be276cf");
  });
});
