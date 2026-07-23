<template>
  <div class="agent-message" :data-state="state">
    <!--
      History-trim divider. Full transcript width, above the row it belongs to,
      so the user can see *why* the assistant lost the earlier context instead of
      silently getting a stranger's answer.
    -->
    <div v-if="trimmedBefore" class="agent-trim">
      <span class="agent-trim-rule border-line-soft" aria-hidden="true"></span>
      <span class="agent-trim-label text-[11px] text-mid">{{ trimmedLabel }}</span>
      <span class="agent-trim-rule border-line-soft" aria-hidden="true"></span>
    </div>

    <div class="agent-row" :class="isUser ? 'agent-row-user' : 'agent-row-assistant'">
      <!-- User turn: plain text, never through the rich renderer. -->
      <div v-if="isUser" class="agent-bubble agent-bubble-user">
        <span class="sr-only">{{ speakerLabel }}</span>
        <p class="agent-user-text">{{ content }}</p>
      </div>

      <!-- Failed turn. -->
      <div
        v-else-if="state === 'error'"
        class="agent-bubble agent-bubble-assistant agent-bubble-error"
      >
        <span class="sr-only">{{ speakerLabel }}</span>
        <p class="agent-state-text text-sm leading-relaxed text-status-error">{{ errorLabel }}</p>
        <details v-if="errorDetail" class="agent-details">
          <summary class="agent-summary text-[11px] text-mid">{{ errorDetailsLabel }}</summary>
          <p class="agent-detail-body font-hash text-mid">{{ errorDetail }}</p>
        </details>
        <!-- `tooLong` cannot succeed on retry — offering the button would lie. -->
        <button
          v-if="showErrorRetry"
          type="button"
          class="btn-outline agent-retry self-start px-2.5 py-1 text-xs"
          @click="onRetry"
        >
          {{ retryLabel }}
        </button>
      </div>

      <!-- Assistant not available (deployment or upstream). -->
      <div
        v-else-if="state === 'unavailable'"
        class="agent-bubble agent-bubble-assistant agent-bubble-unavailable"
      >
        <span class="sr-only">{{ speakerLabel }}</span>
        <p class="agent-state-text text-sm leading-relaxed text-mid">{{ unavailableLabel }}</p>
        <button
          v-if="isUpstreamOutage"
          type="button"
          class="btn-outline agent-retry self-start px-2.5 py-1 text-xs"
          @click="onRetry"
        >
          {{ retryLabel }}
        </button>
      </div>

      <!-- Generation stopped by the user. -->
      <div
        v-else-if="state === 'stopped'"
        class="agent-bubble agent-bubble-assistant agent-bubble-stopped"
      >
        <span class="sr-only">{{ speakerLabel }}</span>
        <p class="agent-state-text text-sm leading-relaxed text-mid">{{ stoppedLabel }}</p>
        <button
          type="button"
          class="btn-outline agent-regenerate self-start px-2.5 py-1 text-xs"
          @click="onRegenerate"
        >
          {{ regenerateLabel }}
        </button>
      </div>

      <!-- Normal answer. -->
      <div v-else-if="hasAnswerBody" class="agent-bubble agent-bubble-assistant">
        <span class="sr-only">{{ speakerLabel }}</span>
        <AgentRichText v-if="content" :text="content" :chain="chain" />
        <AgentToolTrail :tools="toolUses" :model="model" />
        <div class="agent-actions">
          <!--
            CopyButton's own aria-label is the generic "copy to clipboard"; the
            fallthrough attribute names *this* control for screen readers, which
            matters in a transcript full of copy buttons.
          -->
          <CopyButton v-if="content" size="sm" :text="content" :aria-label="copyAnswerLabel" />
          <button
            type="button"
            class="badge-soft agent-action-btn agent-regenerate text-[11px] text-mid"
            @click="onRegenerate"
          >
            {{ regenerateLabel }}
          </button>
        </div>
      </div>
    </div>

    <!--
      Proposals live outside the bubble: full transcript width buys the cards
      ~50px, and the drawer is already narrow. `aria-live="off"` opts the subtree
      out of the transcript's role="log" — a sign flow flipping through
      signing/pending/success must not be read out as new transcript content.
    -->
    <div v-if="proposals.length" class="agent-proposals" aria-live="off">
      <slot name="proposals" :proposals="proposals"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AgentRichText from "@/components/agent/AgentRichText.vue";
import AgentToolTrail from "@/components/agent/AgentToolTrail.vue";
import CopyButton from "@/components/common/CopyButton.vue";

// The only `reason` that a retry can plausibly fix; a deployment that has no
// assistant configured will still have none a second later.
const UPSTREAM_REASON = "agent_upstream_error";

// Keyed by `message.error.kind` (WP-I's classifyAgentError).
const ERROR_COPY = Object.freeze({
  rateLimited: {
    key: "agent.errorRateLimited",
    fallback: "You've reached the question limit for now. Try again in a moment.",
  },
  tooLong: {
    key: "agent.errorTooLong",
    fallback: "This conversation got too long. Start a new chat to continue.",
  },
  offline: {
    key: "agent.errorOffline",
    fallback: "You appear to be offline. Check your connection and try again.",
  },
  generic: {
    key: "agent.errorGeneric",
    fallback: "Something went wrong reaching the assistant.",
  },
});

const props = defineProps({
  message: { type: Object, required: true },
  chain: { type: String, default: "n3" },
});

const emit = defineEmits(["retry", "regenerate"]);

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// The message object belongs to WP-A. Everything below reads it defensively and
// never writes to it.
const isUser = computed(() => props.message?.role === "user");

const content = computed(() =>
  typeof props.message?.content === "string" ? props.message.content : "",
);

const trimmedBefore = computed(() => props.message?.trimmedBefore === true);

const toolUses = computed(() =>
  Array.isArray(props.message?.toolUses) ? props.message.toolUses : [],
);

const model = computed(() => (typeof props.message?.model === "string" ? props.message.model : ""));

const proposals = computed(() =>
  Array.isArray(props.message?.proposals) ? props.message.proposals : [],
);

const errorKind = computed(() => {
  const error = props.message?.error;
  const kind = error && typeof error === "object" ? error.kind : "";
  return Object.prototype.hasOwnProperty.call(ERROR_COPY, kind) ? kind : "generic";
});

const errorDetail = computed(() => {
  const error = props.message?.error;
  const detail = error && typeof error === "object" ? error.detail : "";
  return typeof detail === "string" && detail.trim() ? detail : "";
});

const isUpstreamOutage = computed(() => props.message?.reason === UPSTREAM_REASON);

const hasAnswerBody = computed(
  () => Boolean(content.value) || toolUses.value.length > 0 || Boolean(model.value),
);

const state = computed(() => {
  if (isUser.value) return "user";
  if (props.message?.error) return "error";
  if (props.message?.unavailable) return "unavailable";
  if (props.message?.stopped) return "stopped";
  return "answer";
});

const speakerLabel = computed(() =>
  isUser.value ? tf("agent.youSaid", "You said:") : tf("agent.assistantSaid", "Assistant:"),
);

const trimmedLabel = computed(() =>
  tf(
    "agent.historyTrimmed",
    "Earlier messages were trimmed to keep this conversation within limits.",
  ),
);

const errorLabel = computed(() => {
  const copy = ERROR_COPY[errorKind.value];
  return tf(copy.key, copy.fallback);
});

const errorDetailsLabel = computed(() => tf("agent.errorDetails", "Details"));

const showErrorRetry = computed(() => errorKind.value !== "tooLong");

const unavailableLabel = computed(() =>
  isUpstreamOutage.value
    ? tf(
        "agent.unavailableUpstream",
        "The assistant had a temporary problem. Please try again in a moment.",
      )
    : tf("agent.unavailableConfigured", "The AI assistant isn't enabled on this deployment yet."),
);

const stoppedLabel = computed(() => tf("agent.stopped", "Stopped"));

const regenerateLabel = computed(() => tf("agent.regenerate", "Regenerate"));

const retryLabel = computed(() => tf("agent.retry", "Try again"));

const copyAnswerLabel = computed(() => tf("agent.copyAnswer", "Copy answer"));

// Carry this row's message id so the panel retries/regenerates *this* turn and
// not blindly the last one — every assistant row renders one of these buttons.
function onRetry() {
  emit("retry", props.message?.id);
}

function onRegenerate() {
  emit("regenerate", props.message?.id);
}
</script>

<style scoped>
.agent-message {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
}

/* History-trim divider */
.agent-trim {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.agent-trim-rule {
  flex: 1 1 auto;
  border-top-width: 1px;
  border-top-style: solid;
}

.dark .agent-trim-rule {
  border-top-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-trim-label {
  flex-shrink: 1;
  min-width: 0;
  line-height: 1.35;
  text-align: center;
}

/* Rows and bubbles */
.agent-row {
  display: flex;
  min-width: 0;
}

.agent-row-user {
  justify-content: flex-end;
}

.agent-row-assistant {
  justify-content: flex-start;
}

.agent-bubble {
  display: flex;
  min-width: 0;
  max-width: 92%;
  flex-direction: column;
  gap: 0.5rem;
  border-radius: 0.875rem;
  padding: 0.625rem 0.75rem;
}

.agent-bubble-user {
  background: color-mix(in srgb, var(--link) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--link) 30%, transparent);
  color: var(--text-high);
}

.dark .agent-bubble-user {
  background: color-mix(in srgb, var(--link) 18%, rgba(9, 14, 24, 0.6));
  border-color: color-mix(in srgb, var(--link) 34%, transparent);
}

.agent-user-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.agent-bubble-assistant {
  background: var(--surface-glass);
  border: 1px solid var(--line-soft);
}

.dark .agent-bubble-assistant {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-glass) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-state-text {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Error turn */
.agent-bubble-error {
  border-left: 3px solid var(--status-error);
  background: color-mix(in srgb, var(--status-error-bg) 45%, var(--surface-glass));
}

.dark .agent-bubble-error {
  background: color-mix(in srgb, var(--status-error-bg) 34%, var(--surface-glass));
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
  border-left-color: var(--status-error);
}

/* Unavailable turn */
.agent-bubble-unavailable {
  border-left: 3px solid var(--status-warning);
  background: color-mix(in srgb, var(--status-warning-bg) 45%, var(--surface-glass));
}

.dark .agent-bubble-unavailable {
  background: color-mix(in srgb, var(--status-warning-bg) 34%, var(--surface-glass));
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
  border-left-color: var(--status-warning);
}

/* Stopped turn — deliberately unfinished-looking. */
.agent-bubble-stopped {
  border-style: dashed;
  background: color-mix(in srgb, var(--surface-glass) 60%, transparent);
}

.dark .agent-bubble-stopped {
  background: color-mix(in srgb, var(--surface-glass) 72%, rgba(9, 14, 24, 0.6));
  border-color: color-mix(in srgb, var(--line-soft) 72%, rgba(255, 255, 255, 0.02));
}

/* Error detail disclosure */
.agent-details {
  min-width: 0;
  align-self: stretch;
}

.agent-summary {
  display: inline-flex;
  align-items: center;
  /* WCAG 2.2 SC 2.5.8 — an 11px summary is a ~14px target without this. */
  min-height: 1.5rem;
  padding: 0.125rem 0.25rem;
  margin-left: -0.25rem;
  border-radius: 0.25rem;
  cursor: pointer;
  list-style: none;
}

.agent-summary::-webkit-details-marker {
  display: none;
}

.agent-summary::before {
  content: "▸";
  margin-right: 0.375rem;
  font-size: 0.625rem;
  line-height: 1;
}

.agent-details[open] .agent-summary::before {
  content: "▾";
}

.agent-detail-body {
  margin: 0.25rem 0 0;
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.4;
}

/* Hover/focus action row */
.agent-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.agent-message:hover .agent-actions,
.agent-message:focus-within .agent-actions {
  opacity: 1;
}

/* Touch has no hover: the row is always visible below md. */
@media (max-width: 767px) {
  .agent-actions {
    opacity: 1;
  }
}

.agent-action-btn {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  padding: 0.125rem 0.5rem;
  cursor: pointer;
}

.agent-retry,
.agent-regenerate {
  flex-shrink: 0;
}

/* Proposals sit at full transcript width, outside the bubble padding. */
.agent-proposals {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}

@media (prefers-reduced-motion: reduce) {
  .agent-actions {
    transition: none;
  }
}
</style>
