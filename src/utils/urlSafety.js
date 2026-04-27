export function sanitizeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function sanitizeEmailAddress(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 254) return "";
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(raw) ? raw : "";
}
