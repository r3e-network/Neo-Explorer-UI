import { onMounted, onBeforeUnmount, nextTick } from "vue";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within a container element (typically a modal).
 *
 * Usage A — v-if modal (standalone component):
 *   const dialogRef = ref(null);
 *   useFocusTrap(dialogRef);
 *
 * Usage B — inline modal (always mounted, v-if inside parent):
 *   const dialogRef = ref(null);
 *   const { activate, deactivate } = useFocusTrap(dialogRef, { immediate: false });
 *   watch(showModal, v => v ? nextTick(activate) : deactivate());
 *
 * @param {import('vue').Ref<HTMLElement|null>} containerRef
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] - activate on mount
 */
export function useFocusTrap(containerRef, { immediate = true } = {}) {
  let previousActiveElement = null;
  let isActive = false;

  function getFocusableElements() {
    const el = containerRef.value;
    if (!el) return [];
    return Array.from(el.querySelectorAll(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null,
    );
  }

  function handleKeydown(event) {
    if (event.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first || document.activeElement === containerRef.value) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function activate() {
    if (isActive) return;
    isActive = true;
    previousActiveElement = document.activeElement;
    const el = containerRef.value;
    if (!el) return;

    el.addEventListener("keydown", handleKeydown);

    nextTick(() => {
      if (!isActive) return;
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (el) {
        el.focus();
      }
    });
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;
    const el = containerRef.value;
    if (el) {
      el.removeEventListener("keydown", handleKeydown);
    }
    const prev = previousActiveElement;
    previousActiveElement = null;
    if (prev && typeof prev.focus === "function") {
      try { prev.focus(); } catch { /* element may be gone */ }
    }
  }

  if (immediate) {
    onMounted(activate);
    onBeforeUnmount(deactivate);
  }

  return { activate, deactivate };
}
