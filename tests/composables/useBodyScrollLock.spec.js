import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

function stubWindowNumber(property, value) {
  Object.defineProperty(window, property, {
    value,
    configurable: true,
    writable: true,
  });
}

function stubClientWidth(value) {
  Object.defineProperty(document.documentElement, "clientWidth", {
    value,
    configurable: true,
  });
}

describe("useBodyScrollLock", () => {
  let scrollToSpy;
  let handles;

  /** Every handle a test creates is released in afterEach so the shared
   *  document body never leaks a lock into the next test. */
  function createLock() {
    const handle = useBodyScrollLock();
    handles.push(handle);
    return handle;
  }

  beforeEach(() => {
    handles = [];
    document.body.style.cssText = "";
    stubWindowNumber("scrollY", 0);
    stubWindowNumber("pageYOffset", 0);
    stubWindowNumber("innerWidth", 1024);
    stubClientWidth(1024);
    scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;
  });

  afterEach(() => {
    handles.forEach((handle) => handle.unlock());
    document.body.style.cssText = "";
    vi.restoreAllMocks();
  });

  it("freezes the body at the current scroll offset", () => {
    stubWindowNumber("scrollY", 742);

    const { lock, isLocked } = createLock();
    lock();

    expect(isLocked.value).toBe(true);
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-742px");
    expect(document.body.style.width).toBe("100%");
  });

  it("restores the scroll position and leaves body.style byte-identical", () => {
    document.body.style.cssText = "color: red; padding-right: 10px;";
    const before = document.body.style.cssText;
    stubWindowNumber("scrollY", 512);

    const { lock, unlock, isLocked } = createLock();
    lock();
    expect(document.body.style.cssText).not.toBe(before);

    unlock();

    expect(isLocked.value).toBe(false);
    expect(document.body.style.cssText).toBe(before);
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 512);
  });

  it("restores an empty inline style to exactly empty", () => {
    stubWindowNumber("scrollY", 33);

    const { lock, unlock } = createLock();
    lock();
    unlock();

    expect(document.body.style.cssText).toBe("");
    expect(document.body.getAttribute("style")).toBe("");
  });

  it("preserves a pre-existing inline position value", () => {
    document.body.style.cssText = "position: relative; top: 4px; width: 50%;";
    const before = document.body.style.cssText;

    const { lock, unlock } = createLock();
    lock();
    expect(document.body.style.position).toBe("fixed");

    unlock();
    expect(document.body.style.cssText).toBe(before);
  });

  it("compensates for the scrollbar width and restores the original padding", () => {
    stubWindowNumber("innerWidth", 1024);
    stubClientWidth(1009);
    document.body.style.paddingRight = "10px";
    const before = document.body.style.cssText;

    const { lock, unlock } = createLock();
    lock();
    expect(document.body.style.paddingRight).toBe("25px");

    unlock();
    expect(document.body.style.cssText).toBe(before);
  });

  it("does not touch padding when the scrollbar is an overlay one", () => {
    stubWindowNumber("innerWidth", 1024);
    stubClientWidth(1024);

    const { lock, unlock } = createLock();
    lock();
    expect(document.body.style.paddingRight).toBe("");

    unlock();
  });

  it("is idempotent — a second lock is a no-op and one unlock releases", () => {
    stubWindowNumber("scrollY", 120);

    const { lock, unlock, isLocked } = createLock();
    lock();
    const afterFirstLock = document.body.style.cssText;

    stubWindowNumber("scrollY", 999);
    lock();

    expect(isLocked.value).toBe(true);
    expect(document.body.style.cssText).toBe(afterFirstLock);
    expect(document.body.style.top).toBe("-120px");

    unlock();
    expect(isLocked.value).toBe(false);
    expect(document.body.style.cssText).toBe("");
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 120);
  });

  it("survives unlock without lock and repeated unlocks", () => {
    const { lock, unlock, isLocked } = createLock();

    expect(() => unlock()).not.toThrow();
    expect(isLocked.value).toBe(false);
    expect(scrollToSpy).not.toHaveBeenCalled();

    lock();
    unlock();
    expect(() => unlock()).not.toThrow();

    expect(document.body.style.cssText).toBe("");
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps the body frozen until every concurrent holder releases", () => {
    stubWindowNumber("scrollY", 64);

    const first = createLock();
    const second = createLock();

    first.lock();
    second.lock();
    expect(document.body.style.position).toBe("fixed");

    // Out-of-order release must not strand the page in a fixed position.
    first.unlock();
    expect(document.body.style.position).toBe("fixed");
    expect(first.isLocked.value).toBe(false);
    expect(second.isLocked.value).toBe(true);

    second.unlock();
    expect(document.body.style.cssText).toBe("");
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 64);
  });

  it("unlocks automatically when the owning component unmounts", () => {
    stubWindowNumber("scrollY", 256);

    const wrapper = mount({
      template: "<div />",
      setup() {
        const { lock, isLocked } = useBodyScrollLock();
        lock();
        return { isLocked };
      },
    });

    expect(document.body.style.position).toBe("fixed");
    expect(wrapper.vm.isLocked).toBe(true);

    wrapper.unmount();

    expect(document.body.style.cssText).toBe("");
    expect(scrollToSpy).toHaveBeenCalledWith(0, 256);
  });

  it("is a no-op without a DOM body (SSR)", () => {
    Object.defineProperty(document, "body", { value: null, configurable: true });
    try {
      const { lock, unlock, isLocked } = createLock();
      expect(() => lock()).not.toThrow();
      expect(isLocked.value).toBe(false);
      expect(() => unlock()).not.toThrow();
      expect(scrollToSpy).not.toHaveBeenCalled();
    } finally {
      delete document.body;
    }
  });

  it("tolerates a missing window.scrollTo", () => {
    stubWindowNumber("scrollY", 90);
    delete window.scrollTo;

    const { lock, unlock } = createLock();
    lock();

    expect(() => unlock()).not.toThrow();
    expect(document.body.style.cssText).toBe("");
  });
});
