<template>
  <div class="agent-launcher-root">
    <button
      type="button"
      class="agent-fab"
      :class="{ 'agent-fab-open': open }"
      :aria-label="open ? tf('agent.launcherClose', 'Close AI assistant') : tf('agent.launcherOpen', 'Open AI assistant')"
      :title="shortcutTitle"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :aria-controls="open ? 'agent-panel' : undefined"
      @click="toggle"
    >
      <svg v-if="!open" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
      <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>

    <AgentPanel :open="open" @close="close" />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AgentPanel from "@/components/agent/AgentPanel.vue";
import { useAgentHotkey } from "@/composables/useAgentHotkey";

const { t } = useI18n();
// `params` is optional and only used by interpolated messages: vue-i18n resolves
// an unsupplied named placeholder to an empty string, so `agent.shortcutLabel`
// would render "Shortcut: " if the value were not passed through here. The
// English fallback keeps the literal `{keys}` marker for the .replace() below.
const tf = (key, fallback, params) => {
  const value = params ? t(key, params) : t(key);
  return value === key ? fallback : value;
};

const open = ref(false);

function toggle() {
  open.value = !open.value;
}
function close() {
  open.value = false;
}

const { shortcutLabel } = useAgentHotkey(toggle);

const shortcutTitle = computed(() =>
  tf("agent.shortcutLabel", "Shortcut: {keys}", { keys: shortcutLabel.value }).replace(
    "{keys}",
    shortcutLabel.value,
  ),
);
</script>

<style scoped>
/* Bottom-LEFT to avoid any collision with the bottom-right Neo X bridge pill
   (XBridgeHintPill, z-index 60) and the bottom-right back-to-top button. */
.agent-fab {
  position: fixed;
  left: calc(1rem + env(safe-area-inset-left));
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 3rem;
  width: 3rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--link) 45%, transparent);
  background: var(--surface-elevated);
  color: var(--link);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.agent-fab:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--link) 75%, transparent);
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.24),
    0 0 18px color-mix(in srgb, var(--link) 25%, transparent);
}

/* The focus ring is added to the elevation shadow, never swapped for it —
   otherwise the button visibly flattens the moment it takes focus. */
.agent-fab:focus-visible {
  outline: none;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18), 0 0 0 3px var(--ring-focus);
}

.agent-fab-open {
  color: var(--text-mid);
}

.dark .agent-fab {
  border-color: color-mix(in srgb, var(--link) 38%, transparent);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(173, 193, 221, 0.05);
}

.dark .agent-fab:hover {
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.42),
    0 0 18px color-mix(in srgb, var(--link) 25%, transparent);
}

.dark .agent-fab:focus-visible {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.34), 0 0 0 3px var(--ring-focus);
}

/* Below md the drawer is full-bleed and already covers this spot, so the
   X-icon swap would be unreachable chrome. Hide it instead. */
@media (max-width: 767px) {
  .agent-fab-open {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-fab {
    transition: none;
  }
  .agent-fab:hover {
    transform: none;
  }
}
</style>
