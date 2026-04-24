<template>
  <section class="flex min-h-[640px] flex-col rounded-2xl border border-line-soft bg-surface-base shadow-sm">
    <div class="border-b border-line-soft px-5 py-4">
      <h2 class="text-lg font-bold text-high">
        {{ room ? (room.otherParticipantLabel || room.otherParticipantAddress) : $t('chat.selectConversation') }}
      </h2>
      <p class="mt-1 text-sm text-mid">
        {{ room ? room.otherParticipantAddress : $t('chat.openRoom') }}
      </p>
    </div>

    <div class="flex-1 space-y-3 overflow-y-auto px-5 py-4">
      <div v-if="loading" class="text-sm text-mid">{{ $t('chat.loading') }}</div>
      <div v-else-if="!room" class="rounded-xl bg-surface-muted px-4 py-5 text-sm text-mid">
        {{ $t('chat.noActiveRoom') }}
      </div>
      <div v-else-if="messages.length === 0" class="rounded-xl bg-surface-muted px-4 py-5 text-sm text-mid">
        {{ $t('chat.noMessages') }}
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.isOwn ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm"
          :class="message.isOwn ? 'bg-emerald-500 text-white' : 'bg-surface-muted text-high'"
        >
          <p class="whitespace-pre-wrap break-words">{{ message.body }}</p>
          <p class="mt-2 text-[11px]" :class="message.isOwn ? 'text-emerald-50/90' : 'text-mid'">
            {{ formatTimestamp(message.created_at) }}
            <span v-if="message.isOwn && message.read_at"> · {{ $t('chat.read') }}</span>
          </p>
        </div>
      </div>
    </div>

    <div class="border-t border-line-soft px-5 py-4">
      <div class="flex gap-3">
        <textarea
          v-model="draft"
          rows="3"
          class="form-input min-h-[84px] flex-1 resize-none"
          :disabled="!room || sending"
          :placeholder="$t('chat.writePlaceholder')"
        ></textarea>
        <button
          class="self-end rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!room || sending || !draft.trim()"
          @click="handleSend"
        >
          {{ sending ? $t('chat.sending') : $t('chat.send') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  room: { type: Object, default: null },
  messages: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
});

const emit = defineEmits(["send"]);
const draft = ref("");

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function handleSend() {
  const body = draft.value.trim();
  if (!body) return;
  emit("send", body);
  draft.value = "";
}
</script>
