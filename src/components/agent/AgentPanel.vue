<template>
  <Teleport to="body">
    <!--
      The backdrop renders at every breakpoint. It used to be `md:hidden`, which
      made `aria-modal="true"` a lie on desktop and left click-outside dismissal
      working only on phones. Above md it is a light scrim, not a blur.
    -->
    <Transition name="agent-fade">
      <div v-if="open" class="agent-backdrop" aria-hidden="true" @click="close"></div>
    </Transition>

    <Transition name="agent-slide">
      <!--
        v-show, not v-if: unmounting the drawer on close resets every
        AgentProposalCard's local sign state, so a proposal that was already
        signed and broadcast would remount with its Sign button re-armed — a
        second, independent transfer of the same funds the moment the user
        reopens. Keeping the transcript mounted preserves each card's post-sign
        receipt and keeps its Sign button disabled.
      -->
      <aside
        v-show="open"
        id="agent-panel"
        :ref="setPanelEl"
        class="agent-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-panel-title"
        aria-describedby="agent-disclaimer"
        tabindex="-1"
        :aria-busy="loading"
      >
        <!-- Header. `.card-header` stays: its fading underline is app signature. -->
        <header class="agent-header card-header">
          <div class="agent-header-top">
            <div class="agent-header-title">
              <span class="agent-header-icon" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </span>
              <h2 id="agent-panel-title" class="agent-title text-high text-base font-semibold">
                {{ titleLabel }}
              </h2>
              <span
                class="agent-mode-badge"
                :class="isByokActive ? 'agent-mode-badge-byok' : 'agent-mode-badge-hosted'"
                :data-mode="activeMode"
              >
                {{ modeIndicatorLabel }}
              </span>
            </div>

            <div class="agent-header-actions">
              <button
                :ref="setSettingsButtonEl"
                type="button"
                class="agent-icon-btn"
                :class="{ 'agent-icon-btn-active': showSettings }"
                :aria-label="settingsLabel"
                :title="settingsLabel"
                :aria-expanded="showSettings"
                aria-controls="agent-settings-panel"
                @click="toggleSettings"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                type="button"
                class="agent-icon-btn"
                :aria-label="newChatLabel"
                :title="newChatLabel"
                :disabled="!hasMessages"
                @click="newChat"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                class="agent-icon-btn"
                :aria-label="copyTranscriptLabel"
                :title="copyTranscriptLabel"
                :disabled="!hasMessages"
                @click="copyTranscript"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="agent-icon-btn"
                :aria-label="closeLabel"
                :title="closeLabel"
                @click="close"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Chain scope. Explicit and always visible: an answer about the wrong
               network is indistinguishable from a wrong answer. -->
          <div class="agent-chain-switch" role="group" :aria-label="chainGroupLabel">
            <button
              v-for="option in CHAIN_OPTIONS"
              :key="option"
              type="button"
              class="tab-btn agent-chain-btn"
              :class="option === pinnedChain ? 'tab-btn-active agent-chain-btn-active' : 'tab-btn-inactive'"
              :aria-pressed="option === pinnedChain"
              :data-chain="option"
              @click="selectChain(option)"
            >
              {{ chainName(option) }}
            </button>
          </div>
        </header>

        <!-- Undo bar for New chat: a 5s reversible action beats a blocking confirm. -->
        <div v-if="clearedSnapshot" class="agent-bar agent-bar-undo">
          <span class="agent-bar-text text-xs text-mid">{{ newChatClearedLabel }}</span>
          <button type="button" class="btn-outline agent-bar-btn px-2.5 py-1 text-xs" @click="undoNewChat">
            {{ undoLabel }}
          </button>
        </div>

        <!-- Session restore notice. -->
        <p v-if="restored && hasMessages" class="agent-bar agent-bar-note text-xs text-mid">
          {{ restoredNoticeLabel }}
        </p>

        <!-- Chain nudge. Never auto-switches: the user owns the scope. -->
        <div v-if="showChainNudge" class="agent-bar agent-bar-nudge">
          <span class="agent-bar-text text-xs text-mid">{{ chainSwitchPromptLabel }}</span>
          <span class="agent-bar-actions">
            <button type="button" class="btn-outline agent-bar-btn px-2.5 py-1 text-xs" @click="acceptChainSwitch">
              {{ chainSwitchActionLabel }}
            </button>
            <button type="button" class="btn-outline agent-bar-btn px-2.5 py-1 text-xs" @click="dismissChainSwitch">
              {{ chainSwitchDismissLabel }}
            </button>
          </span>
        </div>

        <!-- Conversation body. The settings overlay is a sibling here so it can
             cover the transcript/composer WITHOUT unmounting them: tearing the
             transcript down would reset every AgentProposalCard's post-sign
             state (the reason it is v-show, not v-if). -->
        <div class="agent-body">
        <div
          :ref="setTranscriptEl"
          class="agent-transcript"
          role="log"
          :aria-label="transcriptLabel"
          @scroll="onScroll"
        >
          <div v-if="!hasMessages" class="agent-intro">
            <p class="text-sm leading-relaxed text-mid">{{ introLabel }}</p>
          </div>

          <AgentSuggestions
            v-if="!hasMessages"
            :chain="pinnedChain"
            :path="routePath"
            :disabled="loading"
            @select="onSuggestion"
          />

          <template v-for="message in messages" :key="message.id">
            <!-- System dividers are UI state, never sent to the model. -->
            <p v-if="message.role === 'system'" class="agent-system text-[11px] text-mid">
              {{ message.content }}
            </p>

            <AgentMessageRow
              v-else
              :message="message"
              :chain="pinnedChain"
              @retry="retry"
              @regenerate="regenerate"
            >
              <template #proposals="{ proposals }">
                <template v-for="proposal in proposals" :key="proposalKey(proposal)">
                  <!-- A restored proposal was built against a nonce, gas price and
                       balance that have all moved. It is never signable again. -->
                  <p v-if="proposal && proposal.expired" class="agent-expired text-xs text-mid">
                    {{ proposalExpiredLabel }}
                  </p>
                  <AgentProposalCard v-else :proposal="proposal" />
                </template>
              </template>
            </AgentMessageRow>
          </template>

          <div v-if="loading" class="agent-loading-row">
            <div class="agent-loading-bubble">
              <span class="agent-typing" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="agent-loading-text text-xs text-mid">{{ loadingPhaseLabel }}</span>
              <span v-if="elapsedLabel" class="agent-elapsed font-hash text-xs text-mid">{{ elapsedLabel }}</span>
            </div>
          </div>
        </div>

        <!-- Completion announcements live here, not on the transcript: role="log"
             re-reads streamed content, this reads one honest sentence. -->
        <p class="sr-only" role="status">{{ announcement }}</p>

        <div v-if="unreadAnswer" class="agent-pill-slot">
          <button type="button" class="agent-new-pill" @click="jumpToLatest">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>{{ newMessageLabel }}</span>
          </button>
        </div>

        <AgentComposer
          :ref="setComposerRef"
          v-model="input"
          :loading="loading"
          @submit="send"
          @stop="stopGenerating"
        />

          <!-- Settings overlay. Absolutely positioned over the body (not a
               separate route), so the transcript underneath stays mounted.
               AgentSettings owns its own open/close Transition; the wrapper is
               v-if'd only so an empty opaque layer never sits over the chat. -->
          <div v-if="showSettings" id="agent-settings-panel" class="agent-settings-layer">
            <AgentSettings :open="showSettings" @close="closeSettings" />
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import AgentComposer from "@/components/agent/AgentComposer.vue";
import AgentMessageRow from "@/components/agent/AgentMessageRow.vue";
import AgentProposalCard from "@/components/agent/AgentProposalCard.vue";
import AgentSettings from "@/components/agent/AgentSettings.vue";
import AgentSuggestions from "@/components/agent/AgentSuggestions.vue";
import { useAgentSettings } from "@/composables/useAgentSettings";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { useFocusTrap } from "@/composables/useFocusTrap";
import { askAgent } from "@/services/agentService";
import { isAbortError } from "@/utils/abortError";
import { classifyAgentError } from "@/utils/agentErrors";
import { windowHistory } from "@/utils/agentHistory";
import { toMarkdown } from "@/utils/agentTranscript";
import { copyTextToClipboard } from "@/utils/clipboard";

const CHAIN_OPTIONS = Object.freeze(["n3", "neox", "both"]);

// Versioned so a shape change cannot resurrect an incompatible transcript.
const STORAGE_KEY = "neo-explorer-agent-session-v1";
const STORAGE_VERSION = 1;
const STORAGE_MAX_MESSAGES = 50;
const STORAGE_MAX_CHARS = 100_000;

// Distance from the bottom below which the reader counts as "pinned" and new
// answers may scroll into view without yanking them out of what they were reading.
const PIN_BOTTOM_PX = 48;
const WORKING_AFTER_S = 10;
const LONGER_AFTER_S = 30;
const UNDO_WINDOW_MS = 5000;

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const route = useRoute();
const { t } = useI18n();

function interpolate(template, params) {
  return Object.keys(params).reduce(
    (text, name) => text.split(`{${name}}`).join(String(params[name])),
    String(template),
  );
}

// The established tf(key, fallback) contract plus an optional params bag.
// vue-i18n strips an unsupplied `{chain}`/`{s}` from a *found* message, so
// patching the returned string afterwards silently renders an empty
// placeholder the moment a translation exists. Params must reach t().
const tf = (key, fallback, params = null) => {
  const value = params ? t(key, params) : t(key);
  if (value !== key) return value;
  return params ? interpolate(fallback, params) : fallback;
};

let idCounter = 0;
function nextId() {
  const scope = globalThis.crypto;
  if (scope && typeof scope.randomUUID === "function") {
    try {
      return scope.randomUUID();
    } catch {
      // Falls through to the counter below (non-secure contexts throw).
    }
  }
  idCounter += 1;
  return `agent-${Date.now().toString(36)}-${idCounter}`;
}

const messages = ref([]);
const input = ref("");
const loading = ref(false);
const restored = ref(false);
const announcement = ref("");
const unreadAnswer = ref(false);
const pinnedToBottom = ref(true);
const elapsedSeconds = ref(0);
const clearedSnapshot = ref(null);
const dismissedChainNudge = ref("");
const chainExplicit = ref(false);

// BYOK settings overlay. The gear in the header toggles it; the header badge
// reflects the active provider. This component only reads the composable's
// derived `activeMode` — the key/model/base URL live in (and are read by) the
// composable and the request seam, never here, so no credential touches the
// panel or its session storage.
const { activeMode } = useAgentSettings();
const showSettings = ref(false);
const isByokActive = computed(() => activeMode.value === "byok");

// Imperative DOM handles, deliberately NOT `ref()`. Nothing renders from them,
// and a reactive template ref written during a Teleport's post-render ref phase
// re-triggers this component's own render effect — an unbounded update loop
// (Vue 3.5 reports it as "Maximum recursive updates exceeded"). A plain holder
// satisfies every consumer here: `useFocusTrap` only reads `.value`.
const composerRef = { value: null };
const transcriptEl = { value: null };
const panelEl = { value: null };
const settingsButtonEl = { value: null };

function setPanelEl(el) {
  panelEl.value = el || null;
}

function setTranscriptEl(el) {
  transcriptEl.value = el || null;
}

function setComposerRef(el) {
  composerRef.value = el || null;
}

function setSettingsButtonEl(el) {
  settingsButtonEl.value = el || null;
}

const { activate, deactivate } = useFocusTrap(panelEl, { immediate: false });
const { lock, unlock } = useBodyScrollLock();

let controller = null;
let elapsedTimer = null;
let undoTimer = null;
let escapeAttached = false;

const routePath = computed(() => String(route?.path || "/"));
const routeChain = computed(() => (routePath.value.startsWith("/x") ? "neox" : "n3"));

const pinnedChain = ref(routeChain.value);

const hasMessages = computed(() => messages.value.length > 0);

/* ---------------------------------------------------------------- labels -- */

const titleLabel = computed(() => tf("agent.title", "AI Assistant"));
const closeLabel = computed(() => tf("agent.close", "Close"));
const settingsLabel = computed(() => tf("agent.settings.open", "Settings"));
const modeIndicatorLabel = computed(() =>
  isByokActive.value
    ? tf("agent.settings.usingYourKey", "Using your key")
    : tf("agent.settings.usingHosted", "Hosted assistant"),
);
const newChatLabel = computed(() => tf("agent.newChat", "New chat"));
const newChatClearedLabel = computed(() => tf("agent.newChatCleared", "Conversation cleared"));
const undoLabel = computed(() => tf("agent.undo", "Undo"));
const copyTranscriptLabel = computed(() => tf("agent.copyTranscript", "Copy conversation"));
const transcriptLabel = computed(() => tf("agent.transcriptLabel", "Conversation"));
const chainGroupLabel = computed(() => tf("agent.chainLabel", "Chain"));
const newMessageLabel = computed(() => tf("agent.newMessage", "New answer"));
const proposalExpiredLabel = computed(() =>
  tf("agent.proposalExpired", "This proposal expired — ask again to get a fresh one."),
);
const restoredNoticeLabel = computed(() =>
  tf("agent.restoredNotice", "Restored from this browser session."),
);
const introLabel = computed(() =>
  tf(
    "agent.intro",
    "Ask me about blocks, transactions, addresses, or tokens. I can read on-chain data and propose transactions for you to review.",
  ),
);
const chainSwitchActionLabel = computed(() => tf("agent.chainSwitchAction", "Switch"));
const chainSwitchDismissLabel = computed(() => tf("agent.chainSwitchDismiss", "Keep current"));

function chainName(value) {
  if (value === "neox") return tf("agent.chain.neox", "Neo X");
  if (value === "both") return tf("agent.chain.both", "Both");
  return tf("agent.chain.n3", "Neo N3");
}

const chainSwitchPromptLabel = computed(() =>
  tf("agent.chainSwitchPrompt", "You're browsing {chain}. Switch this chat?", {
    chain: chainName(routeChain.value),
  }),
);

const loadingPhaseLabel = computed(() => {
  if (elapsedSeconds.value >= LONGER_AFTER_S) {
    return tf("agent.takingLonger", "This is taking longer than usual.");
  }
  if (elapsedSeconds.value >= WORKING_AFTER_S) return tf("agent.workingOnIt", "Still working…");
  return tf("agent.thinking", "Thinking…");
});

const elapsedLabel = computed(() =>
  elapsedSeconds.value >= WORKING_AFTER_S
    ? tf("agent.elapsed", "{s}s", { s: elapsedSeconds.value })
    : "",
);

/* ------------------------------------------------------------ chain scope -- */

// `both` covers either route, so it never diverges.
const showChainNudge = computed(
  () =>
    pinnedChain.value !== "both" &&
    pinnedChain.value !== routeChain.value &&
    dismissedChainNudge.value !== routeChain.value,
);

function applyChain(value) {
  const previous = pinnedChain.value;
  if (previous === value) return;
  pinnedChain.value = value;
  chainExplicit.value = true;
  dismissedChainNudge.value = "";
  if (hasMessages.value) {
    pushMessage({
      role: "system",
      content: tf(
        "agent.chainChanged",
        "Switched to {chain}. Earlier answers refer to a different network.",
        { chain: chainName(value) },
      ),
    });
  }
  persist();
}

function selectChain(value) {
  if (!CHAIN_OPTIONS.includes(value)) return;
  applyChain(value);
}

function acceptChainSwitch() {
  applyChain(routeChain.value);
}

function dismissChainSwitch() {
  dismissedChainNudge.value = routeChain.value;
}

/* --------------------------------------------------------------- messages -- */

function pushMessage(message) {
  messages.value.push({ id: nextId(), ...message });
}

function expiredProposal() {
  return { expired: true, id: nextId() };
}

// Content key, never an index: index keys let a retried turn reuse a card
// instance and show a previous transaction's signed receipt.
function proposalKey(proposal) {
  if (!proposal || typeof proposal !== "object") return "agent-proposal";
  if (proposal.expired) return proposal.id || "agent-proposal-expired";
  const tx = proposal.tx && typeof proposal.tx === "object" ? proposal.tx : null;
  if (tx) return `neox:${tx.to || ""}:${tx.value || ""}:${tx.data || ""}`;
  return `n3:${proposal.scriptHash || ""}:${proposal.operation || ""}`;
}

function applyTrimMarker(trimmedFromId) {
  for (const message of messages.value) {
    const shouldMark = Boolean(trimmedFromId) && message.id === trimmedFromId;
    if (shouldMark) message.trimmedBefore = true;
    else if (message.trimmedBefore) message.trimmedBefore = false;
  }
}

/* ---------------------------------------------------------------- scroll --- */

async function autoScroll(force = false) {
  await nextTick();
  const el = transcriptEl.value;
  if (!el) return;
  if (!force && !pinnedToBottom.value) return;
  el.scrollTop = el.scrollHeight;
  pinnedToBottom.value = true;
  unreadAnswer.value = false;
}

function onScroll() {
  const el = transcriptEl.value;
  if (!el) return;
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  pinnedToBottom.value = distance < PIN_BOTTOM_PX;
  if (pinnedToBottom.value) unreadAnswer.value = false;
}

function jumpToLatest() {
  autoScroll(true);
}

function noteIncoming() {
  if (!props.open || !pinnedToBottom.value) unreadAnswer.value = true;
}

/* ------------------------------------------------------------ persistence -- */

function storage() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function clearStorage() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Best effort: a blocked storage never breaks the panel.
  }
}

// Proposals are recorded as inert markers, never as payloads. Nothing signable
// ever reaches storage, so nothing signable can come back out of it.
function toStored(message) {
  const stored = {
    id: message.id,
    role: message.role,
    content: typeof message.content === "string" ? message.content : "",
  };
  if (Array.isArray(message.toolUses) && message.toolUses.length) {
    stored.toolUses = message.toolUses.slice();
  }
  if (message.model) stored.model = message.model;
  if (message.unavailable) {
    stored.unavailable = true;
    stored.reason = typeof message.reason === "string" ? message.reason : "";
  }
  if (message.stopped) stored.stopped = true;
  if (message.error) stored.error = { kind: message.error.kind || "generic" };
  if (Array.isArray(message.proposals) && message.proposals.length) {
    stored.proposals = message.proposals.map(() => ({ expired: true }));
  }
  return stored;
}

function fromStored(message) {
  const next = {
    id: typeof message.id === "string" && message.id ? message.id : nextId(),
    role: message.role,
    content: typeof message.content === "string" ? message.content : "",
  };
  if (Array.isArray(message.toolUses)) {
    next.toolUses = message.toolUses.filter((tool) => typeof tool === "string");
  }
  if (typeof message.model === "string") next.model = message.model;
  if (message.unavailable) {
    next.unavailable = true;
    next.reason = typeof message.reason === "string" ? message.reason : "";
  }
  if (message.stopped) next.stopped = true;
  if (message.error && typeof message.error === "object") {
    next.error = { kind: message.error.kind || "generic" };
  }
  if (Array.isArray(message.proposals) && message.proposals.length) {
    next.proposals = message.proposals.map(() => expiredProposal());
  }
  return next;
}

function isStoredMessage(message) {
  return Boolean(message) && (message.role === "user" || message.role === "assistant" || message.role === "system");
}

function persist() {
  const store = storage();
  if (!store) return;
  if (!hasMessages.value) {
    clearStorage();
    return;
  }
  try {
    let list = messages.value.slice(-STORAGE_MAX_MESSAGES).map(toStored);
    let payload = serialize(list);
    while (payload.length > STORAGE_MAX_CHARS && list.length > 1) {
      list = list.slice(1);
      payload = serialize(list);
    }
    if (payload.length > STORAGE_MAX_CHARS) {
      clearStorage();
      return;
    }
    store.setItem(STORAGE_KEY, payload);
  } catch {
    // Quota exceeded or a serialization cycle: persistence is a convenience.
  }
}

function serialize(list) {
  return JSON.stringify({
    v: STORAGE_VERSION,
    chain: pinnedChain.value,
    explicit: chainExplicit.value,
    messages: list,
  });
}

function restoreSession() {
  const store = storage();
  if (!store) return;
  let raw = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearStorage();
    return;
  }
  if (!parsed || parsed.v !== STORAGE_VERSION || !Array.isArray(parsed.messages)) {
    clearStorage();
    return;
  }

  const list = parsed.messages
    .filter(isStoredMessage)
    .slice(-STORAGE_MAX_MESSAGES)
    .map(fromStored);
  if (list.length === 0) {
    clearStorage();
    return;
  }

  messages.value = list;
  restored.value = true;
  if (CHAIN_OPTIONS.includes(parsed.chain)) {
    pinnedChain.value = parsed.chain;
    chainExplicit.value = parsed.explicit === true;
  }
}

restoreSession();

/* ------------------------------------------------------------ conversation - */

function abortInFlight() {
  if (controller) {
    controller.abort();
    controller = null;
  }
}

function startElapsedTimer() {
  stopElapsedTimer();
  elapsedSeconds.value = 0;
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value += 1;
  }, 1000);
}

function stopElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

async function runConversation() {
  abortInFlight();
  const active = new AbortController();
  controller = active;
  loading.value = true;
  announcement.value = "";
  startElapsedTimer();

  // Window the request: the backend hard-caps at 20 messages / 8000 chars and
  // answers 413, so an unwindowed transcript breaks permanently around turn 20.
  const { history, trimmedFromId } = windowHistory(messages.value);
  applyTrimMarker(trimmedFromId);
  autoScroll();

  try {
    const result = await askAgent({
      messages: history,
      chain: pinnedChain.value,
      signal: active.signal,
    });

    if (result?.unavailable) {
      pushMessage({
        role: "assistant",
        content: "",
        unavailable: true,
        reason: result.reason,
      });
    } else {
      const proposals = Array.isArray(result?.proposals) ? result.proposals : [];
      pushMessage({
        role: "assistant",
        content: typeof result?.answer === "string" ? result.answer : "",
        toolUses: Array.isArray(result?.toolUses) ? result.toolUses : [],
        model: typeof result?.model === "string" ? result.model : "",
        proposals,
      });
      announcement.value = proposals.length
        ? tf(
            "agent.answerReadyWithProposals",
            "Answer received. Review the proposed transaction below.",
          )
        : tf("agent.answerReady", "Answer received.");
    }
    noteIncoming();
  } catch (error) {
    // A user-initiated Stop / New chat / replacement request, or an unmount,
    // aborts this controller. agentService wraps the rejected fetch as
    // AgentServiceError (whose `cause` is the AbortError), so the old bare
    // `error.name === "AbortError"` check never matched and a deliberate cancel
    // surfaced as a bogus "offline" error bubble. Read the controller's own
    // aborted flag and unwrap the cause: a cancellation must never push an error.
    if (active.signal.aborted || isAbortError(error) || isAbortError(error?.cause)) return;
    pushMessage({ role: "assistant", content: "", error: classifyAgentError(error) });
    noteIncoming();
  } finally {
    // Only the current request may clear the loading state. A stopped request
    // rejects asynchronously, so an unguarded reset here would kill the spinner
    // of the Regenerate the user already started.
    if (controller === active) {
      controller = null;
      loading.value = false;
      stopElapsedTimer();
      persist();
      autoScroll();
    }
  }
}

function focusComposer() {
  nextTick(() => {
    if (composerRef.value && typeof composerRef.value.focus === "function") {
      composerRef.value.focus();
    }
  });
}

function send() {
  const text = input.value.trim();
  // Load-bearing: AgentComposer deliberately keeps the textarea live during a
  // request, so Enter mid-flight still emits `submit`.
  if (!text || loading.value) return;
  chainExplicit.value = true;
  pushMessage({ role: "user", content: text });
  input.value = "";
  if (composerRef.value && typeof composerRef.value.reset === "function") {
    composerRef.value.reset();
  }
  pinnedToBottom.value = true;
  runConversation();
}

// Retry/Regenerate act on the specific row whose button was clicked, never
// blindly on the last turn. AgentMessageRow renders a button on every assistant
// answer and emits *its own* message id; truncating the transcript at that id
// drops the targeted turn (and everything after it) so runConversation re-runs
// from the preceding question. A blind pop() deleted whichever turn happened to
// be last — a newer answer, or, with a trailing system divider, nothing at all.
function truncateFromId(id) {
  if (!id) return false;
  const index = messages.value.findIndex((message) => message.id === id);
  if (index < 0) return false;
  messages.value.splice(index);
  return true;
}

function retry(id) {
  if (loading.value) return;
  if (!truncateFromId(id)) return;
  runConversation();
}

function regenerate(id) {
  if (loading.value) return;
  if (!truncateFromId(id)) return;
  runConversation();
}

// An abort used to be a silent no-op, leaving a dangling question with no reply.
function stopGenerating() {
  if (!loading.value) return;
  abortInFlight();
  loading.value = false;
  stopElapsedTimer();
  pushMessage({ role: "assistant", content: "", stopped: true });
  persist();
  autoScroll();
}

/* ------------------------------------------------------------- chrome ops -- */

function clearUndoTimer() {
  if (undoTimer) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }
}

function newChat() {
  abortInFlight();
  loading.value = false;
  stopElapsedTimer();
  clearedSnapshot.value = {
    messages: messages.value.slice(),
    chain: pinnedChain.value,
    explicit: chainExplicit.value,
    restored: restored.value,
  };
  messages.value = [];
  restored.value = false;
  unreadAnswer.value = false;
  pinnedToBottom.value = true;
  announcement.value = "";
  chainExplicit.value = false;
  pinnedChain.value = routeChain.value;
  dismissedChainNudge.value = "";
  clearStorage();
  clearUndoTimer();
  undoTimer = setTimeout(() => {
    clearedSnapshot.value = null;
    undoTimer = null;
  }, UNDO_WINDOW_MS);
  focusComposer();
}

function undoNewChat() {
  const snapshot = clearedSnapshot.value;
  if (!snapshot) return;
  messages.value = snapshot.messages;
  pinnedChain.value = snapshot.chain;
  chainExplicit.value = snapshot.explicit;
  restored.value = snapshot.restored;
  clearedSnapshot.value = null;
  clearUndoTimer();
  persist();
  autoScroll(true);
}

async function copyTranscript() {
  const text = toMarkdown(messages.value, { chain: pinnedChain.value });
  const copied = await copyTextToClipboard(text);
  if (copied) announcement.value = tf("agent.copyTranscriptDone", "Conversation copied");
}

function onSuggestion(text) {
  input.value = typeof text === "string" ? text : "";
  focusComposer();
}

function close() {
  emit("close");
}

function toggleSettings() {
  showSettings.value = !showSettings.value;
}

// Return focus to the gear when the overlay closes: the Done button that fired
// this is inside the overlay and unmounts, so focus would otherwise fall to the
// body and escape the pattern the drawer's focus trap maintains.
function closeSettings() {
  if (!showSettings.value) return;
  showSettings.value = false;
  nextTick(() => {
    const button = settingsButtonEl.value;
    if (button && typeof button.focus === "function") button.focus();
  });
}

/* ------------------------------------------------------- modality plumbing - */

function onDocumentKeydown(event) {
  if (event.key !== "Escape" && event.key !== "Esc") return;
  // Escape peels one layer: dismiss the settings overlay first, and only close
  // the whole drawer once the conversation is back in front.
  if (showSettings.value) {
    closeSettings();
    return;
  }
  close();
}

function attachEscape() {
  if (escapeAttached || typeof document === "undefined") return;
  document.addEventListener("keydown", onDocumentKeydown);
  escapeAttached = true;
}

function detachEscape() {
  if (!escapeAttached || typeof document === "undefined") return;
  document.removeEventListener("keydown", onDocumentKeydown);
  escapeAttached = false;
}

function setDrawerBodyClass(isOpen) {
  if (typeof document === "undefined" || !document.body) return;
  document.body.classList.toggle("agent-drawer-open", Boolean(isOpen));
}

function isWideViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(min-width: 768px)").matches;
}

// On a phone the soft keyboard eats ~45% of the viewport; opening straight into
// it hides the drawer the user just asked to see.
function focusOnOpen() {
  if (isWideViewport() && composerRef.value && typeof composerRef.value.focus === "function") {
    composerRef.value.focus();
    return;
  }
  if (panelEl.value && typeof panelEl.value.focus === "function") panelEl.value.focus();
}

watch(routeChain, (chain) => {
  dismissedChainNudge.value = "";
  if (!chainExplicit.value) pinnedChain.value = chain;
});

watch(
  () => props.open,
  (isOpen) => {
    setDrawerBodyClass(isOpen);
    if (isOpen) {
      lock();
      attachEscape();
      nextTick(() => {
        activate();
        // Queued after the trap's own nextTick focus, so this wins.
        nextTick(() => {
          focusOnOpen();
          autoScroll(true);
        });
      });
    } else {
      // Deliberately no abort: a request started before the drawer closed is
      // allowed to land, and arrives flagged as unread.
      unlock();
      detachEscape();
      deactivate();
      // Reopen should land on the conversation, not a stale settings overlay.
      showSettings.value = false;
    }
  },
  // `immediate` so a panel mounted already-open is still modal, locked and
  // marked on the body rather than silently inert.
  { immediate: true },
);

onBeforeUnmount(() => {
  abortInFlight();
  stopElapsedTimer();
  clearUndoTimer();
  detachEscape();
  deactivate();
  unlock();
  setDrawerBodyClass(false);
});
</script>

<style scoped>
.agent-backdrop {
  position: fixed;
  inset: 0;
  z-index: 79;
  background: rgba(4, 8, 16, 0.5);
  backdrop-filter: blur(2px);
}

/* Above md the drawer sits beside the page rather than over it, so the scrim is
   a hint that the page is inert — not a curtain. */
@media (min-width: 768px) {
  .agent-backdrop {
    background: rgba(4, 8, 16, 0.28);
    backdrop-filter: none;
  }
}

/*
  The shell is set directly rather than composed from the shared card class,
  which dragged in a hover border-tint on a non-card, a bright inset hairline
  across an edge with no border, and a full-height blur behind an opaque panel.
*/
.agent-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  height: 100dvh;
  z-index: 80;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  background: var(--surface-elevated);
  border-left: 1px solid var(--line-soft);
  box-shadow: -18px 0 48px rgba(17, 35, 63, 0.14);
}

.agent-panel:focus {
  outline: none;
}

.dark .agent-panel {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-elevated) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-elevated) 90%, rgba(9, 14, 24, 0.98)) 100%
  );
  border-left-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
  box-shadow:
    -18px 0 48px rgba(0, 0, 0, 0.34),
    inset 1px 0 0 rgba(173, 193, 221, 0.05);
}

/* `.card-header` is a flex row; the panel needs two stacked rows but keeps the
   fading green ::after underline, which is a signature of the app. */
.agent-header {
  flex-shrink: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  padding-top: calc(0.75rem + env(safe-area-inset-top));
}

.agent-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.agent-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.agent-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-header-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

.agent-header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  width: 1.75rem;
  flex-shrink: 0;
  border-radius: 0.5rem;
  background: var(--icon-bg-primary);
  color: var(--link);
}

/* Provider badge: a quiet, always-present statement of which key is answering,
   so BYOK mode is never a hidden state. Muted for hosted, accented for byok. */
.agent-mode-badge {
  flex-shrink: 0;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.0625rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid var(--line-soft);
  background: var(--surface-glass);
  color: var(--text-mid);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.5;
}

.agent-mode-badge-byok {
  border-color: color-mix(in srgb, var(--link) 45%, transparent);
  background: var(--icon-bg-primary);
  color: var(--link);
}

.dark .agent-mode-badge-hosted {
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* WCAG 2.2 SC 2.5.8 floor; 2.5rem on touch. */
  height: 1.75rem;
  width: 1.75rem;
  border-radius: 0.5rem;
  color: var(--text-mid);
  transition: background 0.15s ease, color 0.15s ease;
}

.agent-icon-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text-high);
}

.agent-icon-btn:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

.agent-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* The gear reads as pressed while its overlay is open. */
.agent-icon-btn-active,
.agent-icon-btn-active:hover:not(:disabled) {
  background: var(--icon-bg-primary);
  color: var(--link);
}

@media (max-width: 767px) {
  .agent-icon-btn {
    height: 2.5rem;
    width: 2.5rem;
  }
}

/* Chain scope control */
.agent-chain-switch {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  flex-wrap: wrap;
}

.agent-chain-btn {
  min-height: 1.75rem;
  border-radius: 0.5rem;
}

.agent-chain-btn:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

/* `.tab-btn-active` mixes the link colour into white, which is a near-white
   pill on a dark panel. tailwind.css ships no dark counterpart. */
.dark .agent-chain-btn-active {
  background: color-mix(in srgb, var(--link) 18%, rgba(9, 14, 24, 0.92));
  color: var(--link);
}

/* Inline bars: undo, restore notice, chain nudge */
.agent-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--line-soft);
  background: color-mix(in srgb, var(--surface-glass) 70%, transparent);
}

.dark .agent-bar {
  background: color-mix(in srgb, var(--surface-glass) 82%, rgba(9, 14, 24, 0.6));
  border-bottom-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-bar-nudge {
  border-left: 3px solid var(--status-warning);
}

.agent-bar-note {
  margin: 0;
  line-height: 1.35;
}

.agent-bar-text {
  flex: 1 1 12rem;
  min-width: 0;
  margin: 0;
  line-height: 1.35;
}

.agent-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.agent-bar-btn {
  min-height: 1.5rem;
  flex-shrink: 0;
}

/* Conversation body: the flex region the settings overlay is positioned over. */
.agent-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Settings overlay: fills the body, opaque so the chat never shows through,
   and scrolls on its own without chaining to the page. */
.agent-settings-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--surface-elevated);
}

.dark .agent-settings-layer {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-elevated) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-elevated) 90%, rgba(9, 14, 24, 0.98)) 100%
  );
}

/* Transcript */
.agent-transcript {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  /* Keeps a bounced scroll inside the drawer instead of chaining to the page. */
  overscroll-behavior: contain;
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

.dark .agent-intro {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-glass) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-system {
  margin: 0;
  text-align: center;
  line-height: 1.35;
  padding: 0.25rem 0.5rem;
  word-break: break-word;
}

.agent-expired {
  margin: 0;
  border: 1px dashed var(--line-soft);
  border-radius: 0.5rem;
  padding: 0.5rem 0.625rem;
  line-height: 1.35;
}

.dark .agent-expired {
  border-color: color-mix(in srgb, var(--line-soft) 72%, rgba(255, 255, 255, 0.02));
  background: color-mix(in srgb, var(--surface-glass) 60%, rgba(9, 14, 24, 0.5));
}

/* Loading bubble */
.agent-loading-row {
  display: flex;
  justify-content: flex-start;
  min-width: 0;
}

.agent-loading-bubble {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: 92%;
  border-radius: 0.875rem;
  border: 1px solid var(--line-soft);
  background: var(--surface-glass);
  padding: 0.625rem 0.75rem;
}

.dark .agent-loading-bubble {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-glass) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-loading-text {
  line-height: 1.35;
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
  background: var(--text-mid);
  animation: agent-bounce 1.2s infinite ease-in-out;
}

.agent-typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.agent-typing i:nth-child(3) {
  animation-delay: 0.3s;
}

/* "New answer" pill, floating above the composer */
.agent-pill-slot {
  position: relative;
  height: 0;
}

.agent-new-pill {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--link) 45%, transparent);
  background: var(--surface-elevated);
  color: var(--link);
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(17, 35, 63, 0.16);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.agent-new-pill:hover {
  transform: translate(-50%, -1px);
}

.agent-new-pill:focus-visible {
  outline: none;
  box-shadow: 0 6px 18px rgba(17, 35, 63, 0.16), 0 0 0 3px var(--ring-focus);
}

.dark .agent-new-pill {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-elevated) 96%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-elevated) 88%, rgba(9, 14, 24, 0.98)) 100%
  );
  border-color: color-mix(in srgb, var(--link) 38%, transparent);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.42);
}

.dark .agent-new-pill:focus-visible {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.42), 0 0 0 3px var(--ring-focus);
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
  .agent-fade-leave-active,
  .agent-icon-btn,
  .agent-new-pill {
    transition: none;
  }
  .agent-new-pill:hover {
    transform: translateX(-50%);
  }
  .agent-typing i {
    animation: none;
  }
}
</style>
