<template>
  <div class="agent-launcher-root">
    <button
      type="button"
      class="agent-fab"
      :class="{ 'agent-fab-open': open }"
      :aria-label="open ? tf('agent.launcherClose', 'Close AI assistant') : tf('agent.launcherOpen', 'Open AI assistant')"
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-controls="agent-panel"
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
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AgentPanel from "@/components/agent/AgentPanel.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const open = ref(false);

function toggle() {
  open.value = !open.value;
}
function close() {
  open.value = false;
}
</script>

<style scoped>
/* Bottom-LEFT to avoid any collision with the bottom-right Neo X bridge pill
   (XBridgeHintPill, z-index 60) and the bottom-right back-to-top button. */
.agent-fab {
  position: fixed;
  left: 1rem;
  bottom: 1rem;
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
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.24), 0 0 18px rgba(0, 229, 153, 0.25);
}

.agent-fab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring-focus, rgba(0, 229, 153, 0.35));
}

.agent-fab-open {
  color: var(--text-mid);
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
