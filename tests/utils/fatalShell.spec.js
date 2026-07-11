import { describe, expect, it, vi } from "vitest";
import { renderFatalShell } from "@/utils/fatalShell";

describe("renderFatalShell", () => {
  it("renders a CSP-compatible recovery action without inline HTML handlers", () => {
    document.body.innerHTML = '<main id="app"><span>old content</span></main>';
    const reload = vi.fn();

    expect(renderFatalShell({ documentRef: document, reload })).toBe(true);

    const root = document.getElementById("app");
    const button = root.querySelector("button");
    expect(root.textContent).toContain("Something went wrong");
    expect(root.querySelector("[onclick]")).toBeNull();
    button.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("returns false when the application root is unavailable", () => {
    document.body.innerHTML = "";
    expect(renderFatalShell({ documentRef: document })).toBe(false);
  });
});
