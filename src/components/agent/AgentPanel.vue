<template>
  <Teleport to="body">
    <!-- Backdrop (mobile only) -->
    <Transition name="agent-fade">
      <div
        v-if="open"
        class="agent-backdrop md:hidden"
        aria-hidden="true"
        @click="close"
      ></div>
    </Transition>

    <!-- Drawer -->
    <Transition name="agent-slide">
      <aside
        v-if="open"
        id="agent-panel"
        ref="panelEl"
        class="agent-panel etherscan-card"
        role="dialog"
        aria-modal="true"
        :aria-label="tf('agent.title', 'AI Assistant')"
        @keydown.esc.stop.prevent="close"
      >
        <!-- Header -->
        <header class="agent-header card-header">
          <div class="flex items-center gap-2">
            <span class="agent-header-icon" aria-hidden="true">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </span>
            <h2 class="text-high text-base font-semibold">{{ tf("agent.title", "AI Assistant") }}</h2>
          </div>
          <button
            type="button"
            class="agent-icon-btn"
            :aria-label="tf('agent.close', 'Close')"
            @click="close"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <!-- Transcript -->
        <div ref="transcriptEl" class="agent-transcript" role="log" aria-live="polite">
          <!-- Empty / intro -->
          <div v-if="messages.length === 0" class="agent-intro">
            <p class="text-sm leading-relaxed text-mid">
              {{ tf("agent.intro", "Ask me about blocks, transactions, addresses, or tokens. I can read on-chain data and propose transactions for you to review.") }}
            </p>
          </div>

          <template v-for="(msg, index) in messages" :key="index">
            <!-- User -->
            <div v-if="msg.role === 'user'" class="agent-row agent-row-user">
              <div class="agent-bubble agent-bubble-user">{{ msg.content }}</div>
            </div>

            <!-- Assistant -->
            <div v-else class="agent-row agent-row-assistant">
              <div class="agent-bubble agent-bubble-assistant">
                <!-- Unavailable states -->
                <p v-if="msg.unavailable" class="text-sm leading-relaxed text-mid">
                  {{ unavailableText(msg.reason) }}
                </p>

                <!-- Error -->
                <div v-else-if="msg.error" class="flex flex-col gap-2">
                  <p class="text-sm text-status-error">
                    {{ tf("agent.errorGeneric", "Something went wrong reaching the assistant.") }}
                  </p>
                  <button type="button" class="btn-outline self-start px-2.5 py-1 text-xs" @click="retry">
                    {{ tf("agent.retry", "Try again") }}
                  </button>
                </div>

                <!-- Normal answer -->
                <template v-else>
                  <p v-if="msg.content" class="agent-answer text-sm leading-relaxed text-high">{{ msg.content }}</p>

                  <!-- Tool-use chips -->
                  <div v-if="msg.toolUses && msg.toolUses.length" class="mt-2 flex flex-wrap gap-1.5">
                    <span v-for="(tool, ti) in msg.toolUses" :key="ti" class="badge-soft text-[11px] text-mid">
                      {{ tf("agent.via", "via") }} {{ tool }}
                    </span>
                  </div>

                  <!-- Proposals -->
                  <div v-if="msg.proposals && msg.proposals.length" class="mt-3 flex flex-col gap-3">
                    <AgentProposalCard v-for="(proposal, pi) in msg.proposals" :key="pi" :proposal="proposal" />
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- Loading bubble -->
          <div v-if="loading" class="agent-row agent-row-assistant">
            <div class="agent-bubble agent-bubble-assistant">
              <span class="agent-typing" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="sr-only">{{ tf("agent.thinking", "Thinking…") }}</span>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <form class="agent-composer" @submit.prevent="send">
          <div class="agent-composer-row">
            <textarea
              ref="inputEl"
              v-model="input"
              class="agent-input"
              rows="1"
              :placeholder="tf('agent.inputPlaceholder', 'Ask about Neo N3 or Neo X…')"
              :disabled="loading"
              :aria-label="tf('agent.inputPlaceholder', 'Ask about Neo N3 or Neo X…')"
              @keydown.enter.exact.prevent="send"
            ></textarea>
            <button
              type="submit"
              class="btn-primary agent-send"
              :disabled="loading || !input.trim()"
              :aria-label="tf('agent.send', 'Send')"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p class="agent-disclaimer">
            {{ tf("agent.disclaimer", "The assistant can read and propose only. You always review and sign in your own wallet.") }}
          </p>
        </form>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import AgentProposalCard from "@/components/agent/AgentProposalCard.vue";
import { askAgent } from "@/services/agentService";

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const route = useRoute();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const messages = ref([]);
const input = ref("");
const loading = ref(false);

const inputEl = ref(null);
const transcriptEl = ref(null);
const panelEl = ref(null);

let controller = null;

function abortInFlight() {
  if (controller) {
    controller.abort();
    controller = null;
  }
}

function close() {
  emit("close");
}

function currentChain() {
  return route.path.startsWith("/x") ? "neox" : "n3";
}

async function scrollToBottom() {
  await nextTick();
  const el = transcriptEl.value;
  if (el) el.scrollTop = el.scrollHeight;
}

// Build the running user/assistant text history the backend expects.
function conversationHistory() {
  return messages.value
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: m.content }));
}

async function runConversation() {
  abortInFlight();
  controller = new AbortController();
  const signal = controller.signal;
  loading.value = true;
  scrollToBottom();

  try {
    const result = await askAgent({
      messages: conversationHistory(),
      chain: currentChain(),
      signal,
    });

    if (result?.unavailable) {
      messages.value.push({ role: "assistant", content: "", unavailable: true, reason: result.reason });
    } else {
      messages.value.push({
        role: "assistant",
        content: result?.answer || "",
        toolUses: result?.toolUses || [],
        proposals: result?.proposals || [],
      });
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
    messages.value.push({ role: "assistant", content: "", error: true });
  } finally {
    if (controller && controller.signal === signal) controller = null;
    loading.value = false;
    scrollToBottom();
  }
}

function send() {
  const text = input.value.trim();
  if (!text || loading.value) return;
  messages.value.push({ role: "user", content: text });
  input.value = "";
  runConversation();
}

function retry() {
  const last = messages.value[messages.value.length - 1];
  if (last && last.role === "assistant" && (last.error || last.unavailable)) {
    messages.value.pop();
  }
  if (loading.value) return;
  runConversation();
}

function unavailableText(reason) {
  if (reason === "agent_upstream_error") {
    return tf("agent.unavailableUpstream", "The assistant had a temporary problem. Please try again in a moment.");
  }
  return tf("agent.unavailableConfigured", "The AI assistant isn't enabled on this deployment yet.");
}

onBeforeUnmount(() => {
  abortInFlight();
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        if (inputEl.value) inputEl.value.focus();
      });
      scrollToBottom();
    } else {
      abortInFlight();
      loading.value = false;
    }
  },
);
</script>

<style scoped>
.agent-backdrop {
  position: fixed;
  inset: 0;
  z-index: 79;
  background: rgba(4, 8, 16, 0.5);
  backdrop-filter: blur(2px);
}

.agent-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  border-radius: 0;
  border-top: 0;
  border-bottom: 0;
  border-right: 0;
}

.agent-header {
  flex-shrink: 0;
}

.agent-header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  width: 1.75rem;
  border-radius: 0.5rem;
  background: var(--icon-bg-primary);
  color: var(--link);
}

.agent-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  width: 1.75rem;
  border-radius: 0.5rem;
  color: var(--text-low);
  transition: background 0.15s ease, color 0.15s ease;
}
.agent-icon-btn:hover {
  background: var(--surface-hover);
  color: var(--text-high);
}

.agent-transcript {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.agent-intro {
  border: 1px solid var(--line-soft);
  border-radius: 0.75rem;
  background: var(--surface-glass);
  padding: 0.875rem;
}

.agent-row {
  display: flex;
}
.agent-row-user {
  justify-content: flex-end;
}
.agent-row-assistant {
  justify-content: flex-start;
}

.agent-bubble {
  max-width: 92%;
  border-radius: 0.875rem;
  padding: 0.625rem 0.75rem;
}
.agent-bubble-user {
  background: color-mix(in srgb, var(--link) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--link) 30%, transparent);
  color: var(--text-high);
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.agent-bubble-assistant {
  background: var(--surface-glass);
  border: 1px solid var(--line-soft);
}
.agent-answer {
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-typing {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  height: 1rem;
}
.agent-typing i {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--text-low);
  animation: agent-bounce 1.2s infinite ease-in-out;
}
.agent-typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.agent-typing i:nth-child(3) {
  animation-delay: 0.3s;
}

.agent-composer {
  flex-shrink: 0;
  border-top: 1px solid var(--line-soft);
  padding: 0.75rem;
  background: var(--surface-elevated);
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
}
.agent-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--link) 55%, transparent);
  box-shadow: 0 0 0 3px var(--ring-focus, rgba(0, 229, 153, 0.25));
}
.agent-input:disabled {
  opacity: 0.6;
}
.agent-send {
  flex-shrink: 0;
  padding: 0.5rem;
  border-radius: 0.625rem;
}
.agent-send:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.agent-disclaimer {
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--text-low);
}

/* Transitions */
.agent-slide-enter-active,
.agent-slide-leave-active {
  transition: transform 0.25s ease;
}
.agent-slide-enter-from,
.agent-slide-leave-to {
  transform: translateX(100%);
}
.agent-fade-enter-active,
.agent-fade-leave-active {
  transition: opacity 0.2s ease;
}
.agent-fade-enter-from,
.agent-fade-leave-to {
  opacity: 0;
}

@keyframes agent-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-slide-enter-active,
  .agent-slide-leave-active,
  .agent-fade-enter-active,
  .agent-fade-leave-active {
    transition: none;
  }
  .agent-typing i {
    animation: none;
  }
}
</style>
