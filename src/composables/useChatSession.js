import { ref } from "vue";
import { chatService } from "@/services/chatService";
import { connectedAccount } from "@/utils/wallet";
import { loadWalletService } from "@/utils/lazyServices";

const chatSession = ref(null);
const unreadCount = ref(0);
const notifications = ref([]);
const restoring = ref(false);

function normalizePublicKey(value) {
  const raw = String(value || "").trim();
  return raw || "";
}

async function restoreChatSession() {
  if (restoring.value) return chatSession.value;
  restoring.value = true;

  try {
    const session = await chatService.getSession();
    if (session?.address && connectedAccount.value && session.address !== connectedAccount.value) {
      clearChatSession();
      return null;
    }

    chatSession.value = session?.address ? session : null;
    if (!chatSession.value) {
      unreadCount.value = 0;
      notifications.value = [];
    }

    return chatSession.value;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearChatSession();
      return null;
    }
    throw error;
  } finally {
    restoring.value = false;
  }
}

async function ensureInteractiveChatSession() {
  if (!connectedAccount.value) throw new Error("Wallet not connected");
  const walletService = await loadWalletService();

  const existing = await restoreChatSession();
  if (existing?.address === connectedAccount.value) {
    return existing;
  }

  const chatAuthSupport =
    typeof walletService.getChatAuthSupport === "function"
      ? walletService.getChatAuthSupport()
      : { supported: true, reason: "" };
  if (!chatAuthSupport.supported) {
    throw new Error(chatAuthSupport.reason || "This wallet is not supported for NeoChat login.");
  }

  const challenge = await chatService.requestChallenge(connectedAccount.value);
  const signed = await walletService.signMessage(challenge.message);
  const signature = String(signed?.signature || signed?.data || "").trim();
  const publicKey =
    normalizePublicKey(signed?.publicKey) ||
    normalizePublicKey(walletService.account?.publicKey) ||
    normalizePublicKey(walletService.account?.pubKey);

  if (!signature || !publicKey) {
    throw new Error(
      "This wallet connection did not provide the verifiable Neo public key required for NeoChat login."
    );
  }

  const session = await chatService.verifyChallenge({
    challengeId: challenge.challengeId,
    address: connectedAccount.value,
    signature,
    publicKey,
  });

  chatSession.value = session?.address ? session : null;
  return chatSession.value;
}

async function refreshNotifications() {
  if (!chatSession.value?.address) {
    unreadCount.value = 0;
    notifications.value = [];
    return { unreadCount: 0, notifications: [] };
  }

  const payload = await chatService.getNotifications({ currentAddress: chatSession.value.address });
  unreadCount.value = Number(payload?.unreadCount || 0);
  notifications.value = Array.isArray(payload?.notifications) ? payload.notifications : [];
  return {
    unreadCount: unreadCount.value,
    notifications: notifications.value,
  };
}

function clearChatSession() {
  chatSession.value = null;
  unreadCount.value = 0;
  notifications.value = [];
}

export function useChatSession() {
  return {
    chatSession,
    unreadCount,
    notifications,
    restoring,
    restoreChatSession,
    ensureInteractiveChatSession,
    refreshNotifications,
    clearChatSession,
  };
}

export default useChatSession;
