<template>
  <div class="agent-suggestions">
    <p class="agent-suggestions-title text-xs font-semibold uppercase tracking-[0.14em] text-mid">
      {{ tf("agent.suggestionsTitle", "Try asking") }}
    </p>
    <div class="mt-2 flex flex-wrap gap-2">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        type="button"
        class="agent-suggestion-chip btn-outline px-2.5 py-1 text-xs"
        :data-suggestion-id="suggestion.id"
        :disabled="disabled"
        @click="pick(suggestion)"
      >
        {{ promptText(suggestion) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { buildSuggestions } from "@/utils/agentSuggestions";

const props = defineProps({
  chain: { type: String, default: "n3" },
  path: { type: String, default: "/" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["select"]);

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const suggestions = computed(() => buildSuggestions({ path: props.path, chain: props.chain }));

function promptText(suggestion) {
  return tf(suggestion.key, suggestion.fallback);
}

// A chip only ever hands the text to the parent. It must NOT send: the panel
// populates the composer and focuses it, so no single tap can reach a wallet
// prompt.
function pick(suggestion) {
  if (props.disabled) return;
  emit("select", promptText(suggestion));
}
</script>

<style scoped>
.agent-suggestions-title {
  margin: 0;
}

.agent-suggestion-chip {
  /* WCAG 2.2 SC 2.5.8 — 28px tall, comfortably over the 24px floor. */
  min-height: 1.75rem;
  border-radius: 0.5rem;
  line-height: 1.25;
  text-align: left;
  white-space: normal;
  max-width: 100%;
  word-break: break-word;
}

.agent-suggestion-chip:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

.agent-suggestion-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* .btn-outline already carries themed light/dark fills; only the disabled
   veil needs a dark counterpart so the chips do not wash out on the panel. */
.dark .agent-suggestion-chip:disabled {
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .agent-suggestion-chip {
    transition: none;
  }
}
</style>
