import { useFocusTrap } from "@/composables/useFocusTrap";
import { ref, nextTick } from "vue";

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    onMounted: vi.fn((fn) => fn()),
    onBeforeUnmount: vi.fn(),
  };
});

function makeContainer(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  // Ensure offsetParent is non-null in jsdom — by default jsdom returns null for elements not in body
  document.body.appendChild(div);
  // Force offsetParent visibility for jsdom by mocking
  for (const el of div.querySelectorAll("*")) {
    Object.defineProperty(el, "offsetParent", { value: div, configurable: true });
  }
  return div;
}

function makeRef(html) {
  const div = makeContainer(html);
  return ref(div);
}

describe("useFocusTrap", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("activates and focuses the first focusable element", async () => {
    const containerRef = makeRef(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `);
    useFocusTrap(containerRef, { immediate: false }).activate();
    await nextTick();
    expect(document.activeElement.id).toBe("first");
  });

  it("falls back to focusing the container when there are no focusable children", async () => {
    const containerRef = makeRef(`<p>nothing focusable</p>`);
    containerRef.value.tabIndex = -1;
    useFocusTrap(containerRef, { immediate: false }).activate();
    await nextTick();
    expect(document.activeElement).toBe(containerRef.value);
  });

  it("wraps Tab from last to first focusable", async () => {
    const containerRef = makeRef(`
      <button id="first">First</button>
      <button id="last">Last</button>
    `);
    useFocusTrap(containerRef, { immediate: false }).activate();
    await nextTick();
    const last = containerRef.value.querySelector("#last");
    last.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    containerRef.value.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe("first");
  });

  it("wraps Shift+Tab from first to last focusable", async () => {
    const containerRef = makeRef(`
      <button id="first">First</button>
      <button id="last">Last</button>
    `);
    useFocusTrap(containerRef, { immediate: false }).activate();
    await nextTick();
    const first = containerRef.value.querySelector("#first");
    first.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    containerRef.value.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe("last");
  });

  it("ignores non-Tab keys", async () => {
    const containerRef = makeRef(`<button id="first">First</button>`);
    useFocusTrap(containerRef, { immediate: false }).activate();
    await nextTick();
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    containerRef.value.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("restores focus to previously active element on deactivate", async () => {
    const before = document.createElement("button");
    before.id = "before-modal";
    document.body.appendChild(before);
    before.focus();
    expect(document.activeElement.id).toBe("before-modal");

    const containerRef = makeRef(`<button id="modal-btn">Modal Btn</button>`);
    const trap = useFocusTrap(containerRef, { immediate: false });
    trap.activate();
    await nextTick();
    expect(document.activeElement.id).toBe("modal-btn");

    trap.deactivate();
    expect(document.activeElement.id).toBe("before-modal");
  });

  it("activate is idempotent — calling twice does not reattach handlers", async () => {
    const containerRef = makeRef(`<button id="first">First</button>`);
    const spy = vi.spyOn(containerRef.value, "addEventListener");
    const trap = useFocusTrap(containerRef, { immediate: false });
    trap.activate();
    trap.activate();
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("deactivate is safe to call when never activated", () => {
    const containerRef = makeRef(`<button>x</button>`);
    const trap = useFocusTrap(containerRef, { immediate: false });
    expect(() => trap.deactivate()).not.toThrow();
  });
});
