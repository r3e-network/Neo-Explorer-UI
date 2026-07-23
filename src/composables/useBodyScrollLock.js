import { getCurrentInstance, onBeforeUnmount, ref } from "vue";

/**
 * Inline style properties this primitive owns. Everything listed here is
 * captured before the lock is applied and written back verbatim on release,
 * so `document.body.style` ends up byte-identical to its pre-lock state.
 */
const OWNED_PROPERTIES = ["position", "top", "width", "paddingRight"];

// Module-level state: several consumers (a drawer plus a modal, say) can hold a
// lock at the same time. Only the first application touches the DOM and only
// the last release restores it, so an out-of-order unlock can never leave the
// page frozen.
let activeLocks = 0;
let savedStyles = null;
let savedScrollY = 0;

function hasDom() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    !!document.body &&
    !!document.documentElement
  );
}

/**
 * Width of the classic (layout-affecting) scrollbar, or 0 when the scrollbar
 * is an overlay one — as on iOS/macOS with "show scrollbars when scrolling".
 * @returns {number}
 */
function measureScrollbarWidth() {
  const width = window.innerWidth - document.documentElement.clientWidth;
  return Number.isFinite(width) && width > 0 ? width : 0;
}

function currentPaddingRight(body) {
  if (typeof window.getComputedStyle !== "function") return 0;
  const padding = Number.parseFloat(window.getComputedStyle(body).paddingRight);
  return Number.isFinite(padding) ? padding : 0;
}

function applyLock() {
  const body = document.body;

  savedStyles = {};
  for (const property of OWNED_PROPERTIES) {
    savedStyles[property] = body.style[property];
  }
  const scrollY = window.scrollY ?? window.pageYOffset ?? 0;
  savedScrollY = Number.isFinite(scrollY) ? scrollY : 0;

  // Compensate for the scrollbar the fixed body is about to remove, otherwise
  // the whole page shifts sideways the instant the drawer opens.
  const scrollbarWidth = measureScrollbarWidth();
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${currentPaddingRight(body) + scrollbarWidth}px`;
  }

  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.width = "100%";
}

function releaseLock() {
  const body = document.body;

  if (savedStyles) {
    for (const property of OWNED_PROPERTIES) {
      // An empty string removes the declaration, which is exactly what we want
      // when the property carried no inline value before the lock.
      body.style[property] = savedStyles[property] || "";
    }
  }

  const scrollY = savedScrollY;
  savedStyles = null;
  savedScrollY = 0;

  if (typeof window.scrollTo === "function") {
    window.scrollTo(0, scrollY);
  }
}

/**
 * Freezes background scrolling without losing the reader's place.
 *
 * `position: fixed` on `<body>` is the only technique that also stops
 * iOS Safari's rubber-band scroll, but it resets the scroll offset — so the
 * offset is captured on lock, mirrored into `top`, and restored on unlock.
 *
 * Usage:
 *   const { lock, unlock, isLocked } = useBodyScrollLock();
 *   watch(open, (v) => (v ? lock() : unlock()));
 *
 * Each call site gets its own handle. `lock()`/`unlock()` are idempotent per
 * handle, safe with no DOM (SSR), and the handle releases itself on unmount
 * when created inside a component.
 *
 * @returns {{ lock: () => void, unlock: () => void, isLocked: import('vue').Ref<boolean> }}
 */
export function useBodyScrollLock() {
  const isLocked = ref(false);

  function lock() {
    if (isLocked.value || !hasDom()) return;
    if (activeLocks === 0) applyLock();
    activeLocks += 1;
    isLocked.value = true;
  }

  function unlock() {
    if (!isLocked.value) return;
    isLocked.value = false;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0 && hasDom()) releaseLock();
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(unlock);
  }

  return { lock, unlock, isLocked };
}
