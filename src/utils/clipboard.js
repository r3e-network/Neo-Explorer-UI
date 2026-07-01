export async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) return false;

  if (globalThis.navigator?.clipboard?.writeText) {
    try {
      await globalThis.navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the legacy selection-based path.
    }
  }

  if (!globalThis.document?.createElement || !globalThis.document?.body) return false;

  const textarea = globalThis.document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.setAttribute("tabindex", "-1");

  globalThis.document.body.appendChild(textarea);
  textarea.select();

  try {
    return Boolean(globalThis.document.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    globalThis.document.body.removeChild(textarea);
  }
}
