<template>
  <Transition name="agent-history-pop">
    <section
      v-if="open"
      class="agent-history etherscan-card"
      role="group"
      :aria-label="titleLabel"
    >
      <header class="agent-history-head">
        <h3 class="agent-history-title text-high text-sm font-semibold">{{ titleLabel }}</h3>
        <button type="button" class="btn-primary agent-history-new" @click="onNew">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          <span>{{ newLabel }}</span>
        </button>
      </header>

      <!-- When IndexedDB is unavailable the store falls back to memory: say so
           plainly rather than let a user assume a reload keeps their history. -->
      <p v-if="!persistent" class="agent-history-notice text-xs text-mid">
        {{ notPersistentLabel }}
      </p>

      <!-- One honest sentence for screen readers on export; the list itself is
           not a live region. -->
      <p class="sr-only" role="status">{{ announcement }}</p>

      <ul v-if="conversations.length" class="agent-history-list" role="list">
        <li v-for="conversation in conversations" :key="conversation.id" class="agent-history-row">
          <!-- Inline rename. Replaces the row in place so the edit never opens a
               modal over the drawer's own overlay. -->
          <div v-if="editingId === conversation.id" class="agent-history-edit">
            <input
              :ref="setRenameInput"
              v-model="draftTitle"
              class="agent-history-input"
              type="text"
              :placeholder="renamePlaceholderLabel"
              :aria-label="renameLabel"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              @keydown.enter.prevent="saveRename"
              @keydown.esc.prevent.stop="cancelRename"
            />
            <div class="agent-history-inline-actions">
              <button type="button" class="btn-outline agent-history-mini" @click="saveRename">
                {{ saveLabel }}
              </button>
              <button type="button" class="btn-outline agent-history-mini" @click="cancelRename">
                {{ cancelLabel }}
              </button>
            </div>
          </div>

          <!-- Inline delete confirm. The store only keeps a removed conversation
               recoverable until the next refresh, so a small confirm beats a
               silent, effectively irreversible delete. -->
          <div v-else-if="confirmingId === conversation.id" class="agent-history-confirm">
            <span class="agent-history-confirm-text text-xs text-high">{{ confirmDeleteLabel }}</span>
            <div class="agent-history-inline-actions">
              <button
                type="button"
                class="btn-outline agent-history-mini agent-history-danger"
                @click="confirmDelete(conversation.id)"
              >
                {{ deleteLabel }}
              </button>
              <button type="button" class="btn-outline agent-history-mini" @click="cancelDelete">
                {{ cancelLabel }}
              </button>
            </div>
          </div>

          <template v-else>
            <button type="button" class="agent-history-open" @click="emitOpen(conversation.id)">
              <span class="agent-history-name text-sm text-high">{{ titleFor(conversation) }}</span>
              <span class="agent-history-meta text-xs text-mid">
                <span v-if="ageFor(conversation)" class="agent-history-time">{{ ageFor(conversation) }}</span>
                <span v-if="ageFor(conversation)" class="agent-history-dot" aria-hidden="true">·</span>
                <span class="agent-history-count">{{ countLabel(conversation) }}</span>
              </span>
            </button>
            <div class="agent-history-actions">
              <button
                type="button"
                class="agent-icon-btn agent-history-action"
                :aria-label="renameLabel"
                :title="renameLabel"
                @click="startRename(conversation)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                class="agent-icon-btn agent-history-action"
                :aria-label="exportLabel"
                :title="exportLabel"
                @click="onExport(conversation)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                class="agent-icon-btn agent-history-action agent-history-action-danger"
                :aria-label="deleteLabel"
                :title="deleteLabel"
                @click="askDelete(conversation)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </template>
        </li>
      </ul>

      <p v-else class="agent-history-empty text-sm text-mid">{{ emptyLabel }}</p>
    </section>
  </Transition>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAgentConversations } from "@/composables/useAgentConversations";
import { copyTextToClipboard } from "@/utils/clipboard";
import { formatAge } from "@/utils/timeFormat";

defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["close", "open", "new"]);

const { t } = useI18n();

function interpolate(template, params) {
  return Object.keys(params).reduce(
    (text, name) => text.split(`{${name}}`).join(String(params[name])),
    String(template),
  );
}

// The established tf(key, fallback) contract used across the drawer, plus an
// optional params bag. vue-i18n strips an unsupplied `{n}` from a *found*
// message, so params must reach t() rather than being patched in afterwards.
const tf = (key, fallback, params = null) => {
  const value = params ? t(key, params) : t(key);
  if (value !== key) return value;
  return params ? interpolate(fallback, params) : fallback;
};

// Singleton composable (useAgentSettings/useTheme pattern). It owns the store
// and keeps `conversations`/`persistent` fresh; this component only reads them
// and calls the mutators. `conversations`/`persistent` are top-level refs so the
// template auto-unwraps them.
const { conversations, persistent, rename, remove, exportMarkdown } = useAgentConversations();

// Exactly one row may be editing or awaiting delete-confirm at a time.
const editingId = ref(null);
const confirmingId = ref(null);
const draftTitle = ref("");
const announcement = ref("");

// Plain holder, not a reactive ref: only the single editing row renders an input
// and all we do is focus it, so nothing needs to render from this.
const renameInputEl = { value: null };
function setRenameInput(el) {
  renameInputEl.value = el || null;
}

const titleLabel = computed(() => tf("agent.history.title", "Conversations"));
const newLabel = computed(() => tf("agent.history.new", "New chat"));
const emptyLabel = computed(() => tf("agent.history.empty", "No saved conversations yet."));
const untitledLabel = computed(() => tf("agent.history.untitled", "Untitled conversation"));
const renameLabel = computed(() => tf("agent.history.rename", "Rename"));
const renamePlaceholderLabel = computed(() =>
  tf("agent.history.renamePlaceholder", "Conversation name"),
);
const saveLabel = computed(() => tf("agent.history.save", "Save"));
const cancelLabel = computed(() => tf("agent.history.cancel", "Cancel"));
const deleteLabel = computed(() => tf("agent.history.delete", "Delete"));
const confirmDeleteLabel = computed(() =>
  tf("agent.history.confirmDelete", "Delete this conversation?"),
);
const exportLabel = computed(() => tf("agent.history.export", "Copy as markdown"));
const exportedLabel = computed(() => tf("agent.history.exported", "Conversation copied"));
const notPersistentLabel = computed(() =>
  tf(
    "agent.history.notPersistent",
    "History can't be saved in this browser, so conversations are kept only until you reload.",
  ),
);

function titleFor(conversation) {
  const title = typeof conversation.title === "string" ? conversation.title.trim() : "";
  return title || untitledLabel.value;
}

function ageFor(conversation) {
  return formatAge(conversation.updatedAt);
}

function countLabel(conversation) {
  const n = Number(conversation.messageCount) || 0;
  return tf("agent.history.messages", "{n} messages", { n });
}

function emitOpen(id) {
  emit("open", id);
}

function onNew() {
  emit("new");
}

function startRename(conversation) {
  confirmingId.value = null;
  editingId.value = conversation.id;
  draftTitle.value = typeof conversation.title === "string" ? conversation.title : "";
  nextTick(() => {
    const el = renameInputEl.value;
    if (el && typeof el.focus === "function") {
      el.focus();
      if (typeof el.select === "function") el.select();
    }
  });
}

async function saveRename() {
  const id = editingId.value;
  if (!id) return;
  const next = draftTitle.value.trim();
  // Clearing the field and saving is treated as a cancel: an empty title would
  // just fall back to the untitled label, so there is nothing to persist.
  if (next) await rename(id, next);
  editingId.value = null;
  draftTitle.value = "";
}

function cancelRename() {
  editingId.value = null;
  draftTitle.value = "";
}

function askDelete(conversation) {
  editingId.value = null;
  confirmingId.value = conversation.id;
}

async function confirmDelete(id) {
  await remove(id);
  if (confirmingId.value === id) confirmingId.value = null;
}

function cancelDelete() {
  confirmingId.value = null;
}

async function onExport(conversation) {
  const markdown = await exportMarkdown(conversation.id);
  const copied = await copyTextToClipboard(markdown);
  if (copied) announcement.value = exportedLabel.value;
}
</script>

<style scoped>
.agent-history {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  height: 100%;
  min-height: 0;
}

.agent-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
  flex-shrink: 0;
}

.agent-history-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-history-new {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  min-height: 2rem;
  padding: 0.375rem 0.75rem;
}

.agent-history-new:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

/* Not-persistent notice: a quiet, accented promise, not an alarm. Mirrors the
   settings no-store line so the two overlays read as one system. */
.agent-history-notice {
  margin: 0;
  line-height: 1.35;
  flex-shrink: 0;
  padding-left: 0.5rem;
  border-left: 3px solid color-mix(in srgb, var(--status-warning) 55%, transparent);
}

.agent-history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.agent-history-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  border: 1px solid var(--line-soft);
  border-radius: 0.625rem;
  background: var(--surface-glass);
  padding: 0.375rem 0.5rem 0.375rem 0.625rem;
}

.dark .agent-history-row {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-glass) 97%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

/* The row's primary target: fills the free space, left-aligned, two stacked
   lines (title + meta). */
.agent-history-open {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
  text-align: left;
  color: var(--text-high);
  transition: background 0.15s ease;
}

.agent-history-open:hover {
  background: var(--surface-hover);
}

.agent-history-open:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

.agent-history-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.agent-history-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  line-height: 1.3;
}

.agent-history-time,
.agent-history-count {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-history-dot {
  flex-shrink: 0;
}

.agent-history-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

/* Row actions reuse the header icon-button recipe but sit a little smaller. */
.agent-history-action {
  height: 1.75rem;
  width: 1.75rem;
}

.agent-history-action-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--status-error, #dc2626) 14%, transparent);
  color: var(--status-error, #dc2626);
}

@media (max-width: 767px) {
  .agent-history-action {
    height: 2.25rem;
    width: 2.25rem;
  }
}

/* Inline rename + delete-confirm share a compact row layout. */
.agent-history-edit,
.agent-history-confirm {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
}

.agent-history-confirm-text {
  flex: 1 1 8rem;
  min-width: 0;
  line-height: 1.3;
}

.agent-history-input {
  flex: 1 1 8rem;
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid var(--line-soft);
  background: var(--surface-glass);
  color: var(--text-high);
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.agent-history-input::placeholder {
  color: var(--text-mid);
}

.agent-history-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--link) 55%, transparent);
  box-shadow: 0 0 0 3px var(--ring-focus);
}

.dark .agent-history-input {
  background: color-mix(in srgb, var(--surface-glass) 90%, rgba(9, 14, 24, 0.96));
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-history-inline-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.agent-history-mini {
  flex-shrink: 0;
  min-height: 1.75rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 0.5rem;
}

.agent-history-mini:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}

.agent-history-danger {
  color: var(--status-error, #dc2626);
  border-color: color-mix(in srgb, var(--status-error, #dc2626) 45%, var(--line-soft));
}

.agent-history-empty {
  margin: 0;
  padding: 1.5rem 0.5rem;
  text-align: center;
  line-height: 1.4;
}

.agent-history-pop-enter-active,
.agent-history-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.agent-history-pop-enter-from,
.agent-history-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .agent-history-pop-enter-active,
  .agent-history-pop-leave-active,
  .agent-history-open,
  .agent-history-input {
    transition: none;
  }
  .agent-history-pop-enter-from,
  .agent-history-pop-leave-to {
    transform: none;
  }
}
</style>
