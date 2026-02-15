import { nextTick, unref } from "vue";

/**
 * Keyboard arrow-key navigation for tab lists.
 *
 * Works with both plain arrays and Vue refs for `tabs`.
 * After switching, focuses the newly-selected tab via `[aria-selected="true"]`
 * scoped to the provided `containerRef` (falls back to document if omitted).
 *
 * @param {import('vue').Ref<Array<{key:string}>> | Array<{key:string}>} tabs
 * @param {import('vue').Ref<string>} activeTab - The currently active tab key (must be a ref).
 * @param {import('vue').Ref<HTMLElement>} [containerRef] - Optional scoping element for focus query.
 * @returns {{ selectNextTab: () => void, selectPrevTab: () => void }}
 */
export function useTabNavigation(tabs, activeTab, containerRef) {
  function getKeys() {
    return unref(tabs).map((t) => t.key);
  }

  function focusActiveTab() {
    nextTick(() => {
      const root = containerRef?.value || document;
      root.querySelector?.(`[role="tab"][aria-selected="true"]`)?.focus();
    });
  }

  function selectNextTab() {
    const keys = getKeys();
    const idx = keys.indexOf(activeTab.value);
    activeTab.value = keys[(idx + 1) % keys.length];
    focusActiveTab();
  }

  function selectPrevTab() {
    const keys = getKeys();
    const idx = keys.indexOf(activeTab.value);
    activeTab.value = keys[(idx - 1 + keys.length) % keys.length];
    focusActiveTab();
  }

  return { selectNextTab, selectPrevTab };
}
