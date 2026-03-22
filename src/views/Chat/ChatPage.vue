<template>
  <div class="page-shell">
    <div class="page-container py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-black tracking-tight text-high">NeoChat</h1>
        <p class="mt-2 max-w-3xl text-sm text-mid">
          Private 1:1 chat backed by Supabase. Rooms are canonicalized by wallet address, so A chatting with B is the same room as B chatting with A.
        </p>
      </div>

      <div v-if="!connectedAccount" class="rounded-2xl border border-line-soft bg-surface-base p-6 text-sm text-mid shadow-sm">
        Connect a wallet to open NeoChat.
      </div>

      <div v-else-if="!chatSession" class="rounded-2xl border border-line-soft bg-surface-base p-6 shadow-sm">
        <h2 class="text-lg font-bold text-high">Authorize NeoChat</h2>
        <p class="mt-2 text-sm text-mid">
          Sign one message once to create a server-validated chat session. You will not be asked to sign every message.
        </p>
        <button
          class="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          :disabled="authorizing"
          @click="authorizeChat"
        >
          {{ authorizing ? "Authorizing…" : "Authorize NeoChat" }}
        </button>
        <p v-if="authError" class="mt-3 text-sm text-red-500">{{ authError }}</p>
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-[320px,1fr]">
        <ChatSidebar
          :rooms="rooms"
          :selected-room-id="selectedRoomId"
          :loading="roomsLoading"
          :target="target"
          :target-error="targetError"
          @update:target="target = $event"
          @ensure-room="handleEnsureRoom"
          @select-room="openRoom"
        />

        <ChatThread
          :room="selectedRoom"
          :messages="messages"
          :loading="messagesLoading"
          :sending="sending"
          @send="sendMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "ChatPage" });

import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Wallet } from "@r3e/neo-js-sdk";
import ChatSidebar from "./components/ChatSidebar.vue";
import ChatThread from "./components/ChatThread.vue";
import { connectedAccount } from "@/utils/wallet";
import { chatService } from "@/services/chatService";
import nnsService from "@/services/nnsService";
import { useChatSession } from "@/composables/useChatSession";

const route = useRoute();
const router = useRouter();
const {
  chatSession,
  restoreChatSession,
  ensureInteractiveChatSession,
  refreshNotifications,
} = useChatSession();

const rooms = ref([]);
const roomsLoading = ref(false);
const messages = ref([]);
const messagesLoading = ref(false);
const sending = ref(false);
const authorizing = ref(false);
const authError = ref("");
const target = ref(String(route.query.with || ""));
const targetError = ref("");
const selectedRoomId = ref(String(route.query.room || ""));

const selectedRoom = computed(() =>
  rooms.value.find((room) => (room.roomId || room.id) === selectedRoomId.value) || null
);

function normalizeRoom(room) {
  return {
    ...room,
    roomId: room.roomId || room.id,
  };
}

function normalizeMessage(message) {
  return {
    ...message,
    isOwn: message.sender_address === connectedAccount.value,
  };
}

async function loadRooms() {
  if (!chatSession.value) return;
  roomsLoading.value = true;
  try {
    rooms.value = (await chatService.getRooms()).map(normalizeRoom);
  } finally {
    roomsLoading.value = false;
  }
}

async function loadMessages(roomId) {
  if (!roomId) return;
  messagesLoading.value = true;
  try {
    messages.value = (await chatService.getMessages(roomId, { limit: 100 })).map(normalizeMessage);
  } finally {
    messagesLoading.value = false;
  }
}

async function markRoomRead(roomId) {
  await chatService.markRoomRead(roomId);
  const room = rooms.value.find((entry) => entry.roomId === roomId);
  if (room) room.unreadCount = 0;
  await refreshNotifications();
}

async function openRoom(room) {
  const normalized = normalizeRoom(room);
  selectedRoomId.value = normalized.roomId;
  await loadMessages(normalized.roomId);
  await markRoomRead(normalized.roomId);
  router.replace({ path: "/chat", query: { room: normalized.roomId } }).catch(() => {});
}

async function resolvePeerAddress(rawTarget) {
  const value = String(rawTarget || "").trim();
  if (!value) throw new Error("Enter an address or domain.");
  if (Wallet.isAddress(value)) {
    return { address: value, label: value };
  }
  const resolved = await nnsService.resolveDomain(value);
  if (!resolved || !Wallet.isAddress(resolved)) {
    throw new Error("Unable to resolve chat recipient.");
  }
  return { address: resolved, label: value };
}

async function handleEnsureRoom(rawTarget = target.value) {
  if (!chatSession.value) return;
  targetError.value = "";
  try {
    const peer = await resolvePeerAddress(rawTarget);
    const room = normalizeRoom(await chatService.ensureRoom({
      peerAddress: peer.address,
      peerLabel: peer.label,
    }));
    const existingIndex = rooms.value.findIndex((entry) => entry.roomId === room.roomId);
    if (existingIndex >= 0) {
      rooms.value.splice(existingIndex, 1, { ...rooms.value[existingIndex], ...room });
    } else {
      rooms.value.unshift(room);
    }
    target.value = "";
    await openRoom(room);
  } catch (error) {
    targetError.value = error.message || "Unable to open chat room.";
  }
}

async function sendMessage(body) {
  if (!selectedRoom.value) return;
  sending.value = true;
  try {
    const message = normalizeMessage(await chatService.sendMessage({
      roomId: selectedRoom.value.roomId,
      recipientAddress: selectedRoom.value.otherParticipantAddress,
      recipientLabel: selectedRoom.value.otherParticipantLabel,
      body,
    }));
    messages.value.push(message);
    const room = rooms.value.find((entry) => entry.roomId === selectedRoom.value.roomId);
    if (room) {
      room.lastMessagePreview = message.body;
      room.lastMessageAt = message.created_at;
      room.lastSenderAddress = message.sender_address;
    }
    await refreshNotifications();
  } finally {
    sending.value = false;
  }
}

async function authorizeChat() {
  authorizing.value = true;
  authError.value = "";
  try {
    await ensureInteractiveChatSession();
    await loadRooms();
    await refreshNotifications();
    if (route.query.with) {
      await handleEnsureRoom(String(route.query.with));
    } else if (route.query.room) {
      const room = rooms.value.find((entry) => entry.roomId === String(route.query.room));
      if (room) {
        await openRoom(room);
      }
    }
  } catch (error) {
    authError.value = error.message || "NeoChat authorization failed.";
  } finally {
    authorizing.value = false;
  }
}

async function bootstrap() {
  if (!connectedAccount.value) return;
  await restoreChatSession();
  if (!chatSession.value) return;
  await loadRooms();
  await refreshNotifications();

  if (route.query.room) {
    const room = rooms.value.find((entry) => entry.roomId === String(route.query.room));
    if (room) {
      await openRoom(room);
      return;
    }
  }
  if (route.query.with) {
    await handleEnsureRoom(String(route.query.with));
  }
}

watch(
  () => route.fullPath,
  async () => {
    target.value = String(route.query.with || "");
    if (!chatSession.value) return;
    if (route.query.room) {
      const room = rooms.value.find((entry) => entry.roomId === String(route.query.room));
      if (room) {
        await openRoom(room);
        return;
      }
    }
    if (route.query.with) {
      await handleEnsureRoom(String(route.query.with));
    }
  }
);

onMounted(() => {
  void bootstrap();
});
</script>
