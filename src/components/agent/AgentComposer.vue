<template>
  <form class="agent-composer" @submit.prevent="onSubmit">
    <div class="agent-composer-row">
      <textarea
        ref="textareaEl"
        class="agent-input"
        rows="1"
        enterkeyhint="send"
        :value="modelValue"
        :maxlength="maxLength"
        :placeholder="placeholderLabel"
        :aria-label="placeholderLabel"
        :aria-busy="loading"
        @input="onInput"
        @keydown.enter.exact="onEnter"
      ></textarea>
      <button
        class="btn-primary agent-send"
        :type="loading ? 'button' : 'submit'"
        :disabled="!loading && !hasText"
        :aria-label="primaryLabel"
        @click="onPrimaryClick"
      >
        <svg v-if="loading" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="2" />
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>

    <div class="agent-composer-meta">
      <p class="agent-hint text-[11px] text-mid">
        {{ tf("agent.sendHint", "Enter to send · Shift+Enter for a new line") }}
      </p>
      <p v-if="showCounter" class="agent-counter text-xs text-mid">{{ counterText }}</p>
    </div>

    <p id="agent-disclaimer" class="agent-disclaimer">
      {{ tf("agent.disclaimer", "The assistant can read and propose only. You always review and sign in your own wallet.") }}
    </p>
  </form>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Autosize ceiling: 8rem at the 16px root the app ships.
const MAX_HEIGHT_PX = 128;
// Only surface the counter once the remaining budget is genuinely tight.
const COUNTER_THRESHOLD = 200;

const props = defineProps({
  modelValue: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  maxLength: { type: Number, default: 4000 },
});

const emit = defineEmits(["update:modelValue", "submit", "stop"]);

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const textareaEl = ref(null);

const hasText = computed(() => String(props.modelValue ?? "").trim().length > 0);

const placeholderLabel = computed(() => tf("agent.inputPlaceholder", "Ask about Neo N3 or Neo X…"));

const primaryLabel = computed(() =>
  props.loading ? tf("agent.stop", "Stop") : tf("agent.send", "Send"),
);

const remaining = computed(() =>
  Math.max(0, props.maxLength - String(props.modelValue ?? "").length),
);

const showCounter = computed(() => remaining.value <= COUNTER_THRESHOLD);

const counterText = computed(() =>
  tf("agent.charsRemaining", "{n} characters left").replace("{n}", String(remaining.value)),
);

// Grow with content up to the ceiling, then scroll inside the textarea.
function resize() {
  const el = textareaEl.value;
  if (!el || !el.style) return;
  el.style.height = "auto";
  const natural = el.scrollHeight || 0;
  el.style.height = `${Math.min(natural, MAX_HEIGHT_PX)}px`;
  el.style.overflowY = natural > MAX_HEIGHT_PX ? "auto" : "hidden";
}

function onInput(event) {
  emit("update:modelValue", event.target.value);
  resize();
}

function onEnter(event) {
  // An IME composition session owns Enter: never steal it, never submit a
  // half-composed candidate. `keyCode === 229` is the legacy signal browsers
  // still emit when `isComposing` is unavailable.
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (!hasText.value) return;
  emit("submit");
}

function onSubmit() {
  if (!hasText.value) return;
  emit("submit");
}

function onPrimaryClick() {
  // While idle the button is a real submit button and the form handles it.
  if (!props.loading) return;
  emit("stop");
}

function focus() {
  const el = textareaEl.value;
  if (el && typeof el.focus === "function") el.focus();
}

function reset() {
  const el = textareaEl.value;
  if (!el || !el.style) return;
  el.style.height = "";
  el.style.overflowY = "";
}

watch(
  () => props.modelValue,
  () => {
    nextTick(resize);
  },
);

onMounted(() => {
  resize();
});

defineExpose({ focus, reset });
</script>

<style scoped>
.agent-composer {
  flex-shrink: 0;
  border-top: 1px solid var(--line-soft);
  padding: 0.75rem;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
  background: var(--surface-elevated);
}

.dark .agent-composer {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-elevated) 96%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-elevated) 90%, rgba(9, 14, 24, 0.98)) 100%
  );
  border-top-color: color-mix(in srgb, var(--line-soft) 82%, rgba(255, 255, 255, 0.02));
}

.agent-composer-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.agent-input {
  flex: 1 1 auto;
  min-width: 0;
  max-height: 8rem;
  resize: none;
  border-radius: 0.625rem;
  border: 1px solid var(--line-soft);
  background: var(--surface-glass);
  color: var(--text-high);
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  line-height: 1.4;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.agent-input::placeholder {
  color: var(--text-mid);
}

.agent-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--link) 55%, transparent);
  box-shadow: 0 0 0 3px var(--ring-focus);
}

.dark .agent-input {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-glass) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-send {
  flex-shrink: 0;
  min-height: 2rem;
  min-width: 2rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
}

.agent-composer-meta {
  margin-top: 0.375rem;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.agent-hint {
  min-width: 0;
}

.agent-counter {
  flex-shrink: 0;
}

.agent-disclaimer {
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--text-mid);
}

@media (prefers-reduced-motion: reduce) {
  .agent-input,
  .agent-send {
    transition: none;
  }
}
</style>
