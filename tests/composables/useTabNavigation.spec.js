import { ref } from "vue";
import { useTabNavigation } from "@/composables/useTabNavigation";

describe("useTabNavigation", () => {
  const tabs = [{ key: "a" }, { key: "b" }, { key: "c" }];

  it("selectNextTab advances to the next tab", () => {
    const activeTab = ref("a");
    const { selectNextTab } = useTabNavigation(tabs, activeTab);
    selectNextTab();
    expect(activeTab.value).toBe("b");
  });

  it("selectNextTab wraps around from last to first", () => {
    const activeTab = ref("c");
    const { selectNextTab } = useTabNavigation(tabs, activeTab);
    selectNextTab();
    expect(activeTab.value).toBe("a");
  });

  it("selectPrevTab goes to the previous tab", () => {
    const activeTab = ref("b");
    const { selectPrevTab } = useTabNavigation(tabs, activeTab);
    selectPrevTab();
    expect(activeTab.value).toBe("a");
  });

  it("selectPrevTab wraps around from first to last", () => {
    const activeTab = ref("a");
    const { selectPrevTab } = useTabNavigation(tabs, activeTab);
    selectPrevTab();
    expect(activeTab.value).toBe("c");
  });

  it("works with Vue ref tabs", () => {
    const refTabs = ref([{ key: "x" }, { key: "y" }]);
    const activeTab = ref("x");
    const { selectNextTab } = useTabNavigation(refTabs, activeTab);
    selectNextTab();
    expect(activeTab.value).toBe("y");
  });

  it("handles single-tab list without error", () => {
    const activeTab = ref("only");
    const { selectNextTab, selectPrevTab } = useTabNavigation([{ key: "only" }], activeTab);
    selectNextTab();
    expect(activeTab.value).toBe("only");
    selectPrevTab();
    expect(activeTab.value).toBe("only");
  });
});
