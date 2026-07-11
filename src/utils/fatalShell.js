export function renderFatalShell({
  documentRef = typeof document === "undefined" ? null : document,
  reload = () => globalThis.location?.reload?.(),
} = {}) {
  const root = documentRef?.getElementById("app");
  if (!root) return false;

  const shell = documentRef.createElement("div");
  Object.assign(shell.style, {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "24px",
    textAlign: "center",
    color: "#e5e7eb",
    background: "#0b0e14",
  });

  const content = documentRef.createElement("div");
  const title = documentRef.createElement("h1");
  title.textContent = "Something went wrong";
  Object.assign(title.style, { fontSize: "20px", margin: "0 0 8px" });

  const message = documentRef.createElement("p");
  message.textContent = "The explorer failed to start. This is usually fixed by reloading.";
  Object.assign(message.style, { opacity: "0.7", margin: "0 0 16px", maxWidth: "36ch" });

  const button = documentRef.createElement("button");
  button.type = "button";
  button.textContent = "Reload";
  button.setAttribute("aria-label", "Reload explorer");
  Object.assign(button.style, {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#111827",
    color: "#e5e7eb",
    cursor: "pointer",
  });
  button.addEventListener("click", reload);

  content.append(title, message, button);
  shell.append(content);
  root.replaceChildren(shell);
  return true;
}
