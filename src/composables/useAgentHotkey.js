import { computed, onBeforeUnmount, onMounted } from "vue";

const APPLE_PLATFORM_RE = /mac|iphone|ipad|ipod/i;

/**
 * True when the current platform uses the Command key as its primary modifier.
 * Prefers the modern `navigator.userAgentData.platform`, falls back to the
 * deprecated `navigator.platform`, then to the user-agent string. Any absent
 * navigator (SSR, worker) reports false so the label degrades to "Ctrl+J".
 *
 * @returns {boolean}
 */
export function isApplePlatform() {
  if (typeof navigator === "undefined" || !navigator) return false;

  const uaData = navigator.userAgentData;
  if (uaData && typeof uaData.platform === "string" && uaData.platform) {
    return APPLE_PLATFORM_RE.test(uaData.platform);
  }
  if (typeof navigator.platform === "string" && navigator.platform) {
    return APPLE_PLATFORM_RE.test(navigator.platform);
  }
  if (typeof navigator.userAgent === "string" && navigator.userAgent) {
    return APPLE_PLATFORM_RE.test(navigator.userAgent);
  }
  return false;
}

/**
 * True when the event target is a text-entry surface. Bare keys must not be
 * intercepted while the user is typing; chords (Cmd/Ctrl held) still are, so
 * the shortcut keeps working from inside the agent composer.
 *
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
export function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tag = typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return target.isContentEditable === true;
}

/**
 * Registers the global Cmd/Ctrl+J shortcut that opens and closes the AI
 * assistant drawer.
 *
 * Cmd/Ctrl+J is unclaimed in this app — the only other global shortcut is the
 * bare `/` that focuses the header search (SearchBox.vue), and no other
 * modifier chord is bound anywhere in `src/`. Bare keys are never swallowed
 * here, so `/` keeps reaching the search box.
 *
 * @param {() => void} onToggle - invoked once per chord press
 * @returns {{ shortcutLabel: import('vue').ComputedRef<string> }}
 */
export function useAgentHotkey(onToggle) {
  const shortcutLabel = computed(() => (isApplePlatform() ? "⌘J" : "Ctrl+J"));

  function handleKeydown(event) {
    if (!event) return;
    // Someone else already acted on this keystroke.
    if (event.defaultPrevented) return;
    // Auto-repeat from a held-down chord would strobe the drawer.
    if (event.repeat) return;

    const withModifier = Boolean(event.metaKey || event.ctrlKey);
    // Without the modifier the keystroke belongs to whatever field has focus.
    if (!withModifier && isEditableTarget(event.target)) return;
    if (!withModifier) return;

    const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
    if (key !== "j") return;

    event.preventDefault();
    if (typeof onToggle === "function") onToggle();
  }

  onMounted(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("keydown", handleKeydown);
  });

  return { shortcutLabel };
}

export default useAgentHotkey;
