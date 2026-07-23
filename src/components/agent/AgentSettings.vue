<template>
  <Transition name="agent-settings-pop">
    <section
      v-if="open"
      class="agent-settings etherscan-card"
      role="group"
      :aria-label="titleLabel"
    >
      <header class="agent-settings-head">
        <h3 class="agent-settings-title text-high text-sm font-semibold">{{ titleLabel }}</h3>
      </header>

      <!-- Model access: hosted (shared key) vs. bring-your-own-key. Segmented
           control reuses the drawer's tab-btn recipe so it reads as one system. -->
      <div class="agent-settings-field">
        <span :id="providerLabelId" class="agent-settings-label">{{ providerLabel }}</span>
        <div class="agent-settings-seg" role="group" :aria-labelledby="providerLabelId">
          <button
            type="button"
            class="tab-btn agent-settings-seg-btn"
            :class="isHosted ? 'tab-btn-active agent-settings-seg-active' : 'tab-btn-inactive'"
            :aria-pressed="isHosted"
            @click="chooseMode('hosted')"
          >
            {{ hostedLabel }}
          </button>
          <button
            type="button"
            class="tab-btn agent-settings-seg-btn"
            :class="isByok ? 'tab-btn-active agent-settings-seg-active' : 'tab-btn-inactive'"
            :aria-pressed="isByok"
            @click="chooseMode('byok')"
          >
            {{ byokLabel }}
          </button>
        </div>
        <p class="agent-settings-help text-xs text-mid">{{ modeHelpLabel }}</p>
      </div>

      <!-- BYOK fields. Only rendered in byok mode; unmounting on switch-away also
           re-hides the key (showKey resets) so it is never left revealed. -->
      <div v-if="isByok" class="agent-settings-byok">
        <div class="agent-settings-field">
          <label :for="keyInputId" class="agent-settings-label">{{ apiKeyLabel }}</label>
          <div class="agent-settings-key-row">
            <input
              :id="keyInputId"
              class="agent-settings-input agent-settings-key"
              :type="showKey ? 'text' : 'password'"
              :value="apiKey"
              :placeholder="apiKeyPlaceholder"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              @input="onKeyInput"
            />
            <button
              type="button"
              class="btn-outline agent-settings-mini"
              :aria-pressed="showKey"
              @click="toggleShowKey"
            >
              {{ showKey ? hideLabel : showLabel }}
            </button>
            <button
              type="button"
              class="btn-outline agent-settings-mini"
              :disabled="!apiKey"
              @click="onClear"
            >
              {{ clearLabel }}
            </button>
          </div>
        </div>

        <div class="agent-settings-field">
          <label :for="modelInputId" class="agent-settings-label">{{ modelLabel }}</label>
          <input
            :id="modelInputId"
            class="agent-settings-input"
            type="text"
            :value="model"
            :placeholder="modelPlaceholder"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @input="onModelInput"
          />
        </div>

        <div class="agent-settings-field">
          <label :for="baseUrlSelectId" class="agent-settings-label">{{ baseUrlLabel }}</label>
          <!-- Limited to the SSRF allowlist (+ default). The panel can never even
               offer an off-allowlist target; the server enforces the same list. -->
          <select
            :id="baseUrlSelectId"
            class="agent-settings-input agent-settings-select"
            :value="baseUrl"
            @change="onBaseUrlChange"
          >
            <option value="">{{ baseUrlDefaultLabel }}</option>
            <option v-for="url in allowedBaseUrls" :key="url" :value="url">{{ url }}</option>
          </select>
        </div>

        <div class="agent-settings-field">
          <label class="agent-settings-check">
            <input
              type="checkbox"
              class="agent-settings-checkbox"
              :checked="rememberKey"
              @change="onRememberChange"
            />
            <span class="agent-settings-check-text text-sm text-high">{{ rememberLabel }}</span>
          </label>
          <p class="agent-settings-help text-xs text-mid">{{ rememberHelpLabel }}</p>
        </div>

        <p class="agent-settings-nostore text-xs text-mid">{{ noStoreLabel }}</p>
      </div>

      <footer class="agent-settings-foot">
        <button type="button" class="btn-primary agent-settings-done" @click="close">
          {{ doneLabel }}
        </button>
      </footer>
    </section>
  </Transition>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAgentSettings, ALLOWED_BASE_URLS } from "@/composables/useAgentSettings";

defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const { t } = useI18n();
// The established tf(key, fallback) contract used across the drawer: fall back to
// the shipped English copy whenever a locale is missing the key.
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// Distinct ids per mounted instance so labels/controls associate correctly even
// if the panel were ever rendered more than once.
let uidSeq = 0;
const uid = `agent-settings-${(uidSeq += 1)}`;
const providerLabelId = `${uid}-provider`;
const keyInputId = `${uid}-key`;
const modelInputId = `${uid}-model`;
const baseUrlSelectId = `${uid}-base-url`;

const settings = useAgentSettings();
// These are the singleton's own refs — read for display, written ONLY through
// the setters below. The component never mutates settings state directly.
const { mode, model, baseUrl, apiKey, rememberKey } = settings;

const allowedBaseUrls = ALLOWED_BASE_URLS;

const isByok = computed(() => mode.value === "byok");
const isHosted = computed(() => !isByok.value);

// showKey is local, ephemeral UI state: the key is masked by default and never
// persisted in the revealed state.
const showKey = ref(false);

const titleLabel = computed(() => tf("agent.settings.title", "Assistant settings"));
const providerLabel = computed(() => tf("agent.settings.provider", "Model access"));
const hostedLabel = computed(() => tf("agent.settings.hosted", "Hosted (default)"));
const byokLabel = computed(() => tf("agent.settings.byok", "Use your own key"));
const modeHelpLabel = computed(() =>
  isByok.value
    ? tf(
        "agent.settings.byokHelp",
        "Runs on your own LLM account. Your key is sent with each request and never stored on our servers.",
      )
    : tf("agent.settings.hostedHelp", "Uses this site's assistant. No setup needed."),
);
const apiKeyLabel = computed(() => tf("agent.settings.apiKey", "API key"));
const apiKeyPlaceholder = computed(() => tf("agent.settings.apiKeyPlaceholder", "sk-…"));
const showLabel = computed(() => tf("agent.settings.show", "Show"));
const hideLabel = computed(() => tf("agent.settings.hide", "Hide"));
const clearLabel = computed(() => tf("agent.settings.clear", "Clear key"));
const modelLabel = computed(() => tf("agent.settings.model", "Model (optional)"));
const modelPlaceholder = computed(() => tf("agent.settings.modelPlaceholder", "provider default"));
const baseUrlLabel = computed(() => tf("agent.settings.baseUrl", "Provider"));
const baseUrlDefaultLabel = computed(() => tf("agent.settings.baseUrlDefault", "Default (DeepSeek)"));
const rememberLabel = computed(() => tf("agent.settings.remember", "Remember on this device"));
const rememberHelpLabel = computed(() =>
  tf(
    "agent.settings.rememberHelp",
    "Off: kept only for this browser tab. On: stored on this device — avoid on shared computers.",
  ),
);
const noStoreLabel = computed(() =>
  tf("agent.settings.noStore", "We never store your key; it is sent per request and not logged."),
);
const doneLabel = computed(() => tf("agent.settings.done", "Done"));

function chooseMode(next) {
  settings.setMode(next);
}

function onKeyInput(event) {
  settings.setApiKey(event.target.value);
}

function onModelInput(event) {
  settings.setModel(event.target.value);
}

function onBaseUrlChange(event) {
  settings.setBaseUrl(event.target.value);
}

function onRememberChange(event) {
  settings.setRememberKey(event.target.checked);
}

function onClear() {
  settings.clearKey();
  // Re-mask once the field is empty; showing an empty box serves no purpose.
  showKey.value = false;
}

function toggleShowKey() {
  showKey.value = !showKey.value;
}

function close() {
  emit("close");
}
</script>

<style scoped>
.agent-settings {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
}

.agent-settings-head {
  display: flex;
  align-items: center;
  min-width: 0;
}

.agent-settings-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.agent-settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-high);
}

.agent-settings-help {
  margin: 0;
  line-height: 1.35;
}

/* Segmented control */
.agent-settings-seg {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--line-soft);
  border-radius: 0.625rem;
  background: var(--surface-glass);
}

.dark .agent-settings-seg {
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-settings-seg-btn {
  flex: 1 1 0;
  min-width: 0;
  min-height: 1.75rem;
  border-radius: 0.5rem;
}

.agent-settings-seg-btn:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

/* `.tab-btn-active` tints toward white, which is near-invisible on the dark
   drawer; mirror AgentPanel's chain-btn treatment. */
.dark .agent-settings-seg-active {
  background: color-mix(in srgb, var(--link) 18%, rgba(9, 14, 24, 0.92));
  color: var(--link);
}

/* BYOK block */
.agent-settings-byok {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.agent-settings-key-row {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.agent-settings-input {
  width: 100%;
  min-width: 0;
  border-radius: 0.625rem;
  border: 1px solid var(--line-soft);
  background: var(--surface-glass);
  color: var(--text-high);
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  line-height: 1.4;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.agent-settings-key {
  flex: 1 1 8rem;
  font-family: var(--font-hash, ui-monospace, SFMono-Regular, Menlo, monospace);
}

.agent-settings-input::placeholder {
  color: var(--text-mid);
}

.agent-settings-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--link) 55%, transparent);
  box-shadow: 0 0 0 3px var(--ring-focus);
}

.agent-settings-select {
  appearance: none;
  cursor: pointer;
}

.dark .agent-settings-input {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-glass) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

/* Compact override of the shared btn-outline for the inline show/clear controls. */
.agent-settings-mini {
  flex-shrink: 0;
  min-height: 2rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  border-radius: 0.5rem;
}

.agent-settings-mini:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

.agent-settings-mini:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.agent-settings-check {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
}

.agent-settings-checkbox {
  margin-top: 0.15rem;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  accent-color: var(--link);
}

.agent-settings-checkbox:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

.agent-settings-check-text {
  line-height: 1.35;
}

/* No-store reassurance: a quiet, always-present promise, accented not alarming. */
.agent-settings-nostore {
  margin: 0;
  line-height: 1.35;
  padding-left: 0.5rem;
  border-left: 3px solid color-mix(in srgb, var(--link) 45%, transparent);
}

.agent-settings-foot {
  display: flex;
  justify-content: flex-end;
}

.agent-settings-done {
  min-height: 2rem;
}

.agent-settings-done:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

/* Enter/leave when the panel is toggled open within the drawer. */
.agent-settings-pop-enter-active,
.agent-settings-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.agent-settings-pop-enter-from,
.agent-settings-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .agent-settings-pop-enter-active,
  .agent-settings-pop-leave-active,
  .agent-settings-input,
  .agent-settings-mini {
    transition: none;
  }
  .agent-settings-pop-enter-from,
  .agent-settings-pop-leave-to {
    transform: none;
  }
}
</style>
