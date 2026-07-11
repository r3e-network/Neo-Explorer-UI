import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";

function mountCard(props) {
  return mount(DashboardStatCard, {
    props: { label: "Metric", ...props },
    global: {
      stubs: {
        AnimatedNumber: true,
        SparklineChart: true,
      },
    },
  });
}

describe("DashboardStatCard", () => {
  it("uses compact type for long fixed-decimal token values", () => {
    const wrapper = mountCard({ value: 64.302851, decimals: 8, suffix: " GAS" });
    const value = wrapper.get('[data-testid="dashboard-stat-value"]');

    expect(value.text()).toBe("64.30285100 GAS");
    expect(value.classes()).toContain("text-lg");
    expect(value.classes()).toContain("break-words");
  });

  it("keeps short integer values prominent", () => {
    const wrapper = mountCard({ value: 3, decimals: 0, suffix: " NEO" });
    expect(wrapper.get('[data-testid="dashboard-stat-value"]').classes()).toContain("text-2xl");
  });
});
