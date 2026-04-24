<template>
  <aside class="rounded-2xl border border-line-soft bg-surface-base p-4 shadow-sm">
    <div class="mb-4">
      <h2 class="text-lg font-bold text-high">{{ $t('chat.title') }}</h2>
      <p class="mt-1 text-sm text-mid">{{ $t('chat.peerToPeer') }}</p>
    </div>

    <div class="mb-4 space-y-2">
      <label class="block text-sm font-medium text-high">{{ $t('chat.startOrOpen') }}</label>
      <div class="flex gap-2">
        <input
          :value="target"
          type="text"
          class="form-input w-full"
          :placeholder="$t('chat.addressPlaceholder')"
          @input="$emit('update:target', $event.target.value)"
        />
        <button
          class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          @click="$emit('ensure-room', target)"
        >
          {{ $t('chat.open') }}
        </button>
      </div>
      <p v-if="targetError" class="text-xs text-red-500">{{ targetError }}</p>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-high">{{ $t('chat.conversations') }}</h3>
        <span v-if="loading" class="text-xs text-mid">{{ $t('chat.loadingConversations') }}</span>
      </div>

      <div v-if="rooms.length === 0" class="rounded-xl bg-surface-muted px-3 py-4 text-sm text-mid">
        {{ $t('chat.noConversations') }}
      </div>

      <button
        v-for="room in rooms"
        :key="room.roomId || room.id"
        class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition"
        :class="selectedRoomId === (room.roomId || room.id) ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-500/30' : 'bg-surface-muted hover:bg-surface-hover'"
        @click="$emit('select-room', room)"
      >
        <div class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600">
          {{ getInitials(room) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-sm font-semibold text-high">
              {{ room.otherParticipantLabel || room.otherParticipantAddress }}
            </p>
            <span
              v-if="room.unreadCount"
              class="inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white"
            >
              {{ room.unreadCount }}
            </span>
          </div>
          <p class="mt-1 truncate text-xs text-mid">{{ room.lastMessagePreview || $t('chat.noMessagesYet') }}</p>
        </div>
      </button>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  rooms: { type: Array, default: () => [] },
  selectedRoomId: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  target: { type: String, default: "" },
  targetError: { type: String, default: "" },
});

defineEmits(["select-room", "ensure-room", "update:target"]);

function getInitials(room) {
  const label = String(room?.otherParticipantLabel || room?.otherParticipantAddress || "?").trim();
  return label.slice(0, 2).toUpperCase() || "?";
}
</script>
