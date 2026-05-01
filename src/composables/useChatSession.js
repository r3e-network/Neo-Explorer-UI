import { ref } from "vue";
import { chatService } from "@/services/chatService";
import { connectedAccount } from "@/utils/wallet";
import { loadWalletService } from "@/utils/lazyServices";

const chatSession = ref(null);
const unreadCount = ref(0);
const notifications = ref([]);
const restoring = ref(false);

function tFallback(key, fallback) {
  const i18n = typeof globalThis !== "undefined" ? globalThis.__neoExplorerI18n__ : null;
  if (i18n?.global?.t) {
    const translated = i18n.global.t(key);
    if (translated && translated !== key) return translated;
  }
  return fallback;
}

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
  // Snapshot the address at the start of the flow. The user can switch
  // accounts in NeoLine while we're awaiting requestChallenge / signMessage,
  // and we must not request a challenge for one address and then verify
  // it as another — the backend would reject it as mismatched.
  const requestedAddress = String(connectedAccount.value || "").trim();
  if (!requestedAddress) throw new Error(tFallback("chat.walletNotConnected", "Wallet not connected"));
  const walletService = await loadWalletService();

  const existing = await restoreChatSession();
  if (existing?.address === requestedAddress) {
    return existing;
  }

  const chatAuthSupport =
    typeof walletService.getChatAuthSupport === "function"
      ? walletService.getChatAuthSupport()
      : { supported: true, reason: "" };
  if (!chatAuthSupport.supported) {
    throw new Error(chatAuthSupport.reason || tFallback("chat.walletNotSupported", "This wallet is not supported for NeoChat login."));
  }

  const challenge = await chatService.requestChallenge(requestedAddress);
  const signed = await walletService.signMessage(challenge.message);

  // Verify that the address didn't change while we awaited the wallet
  // signature. If it did, abort instead of associating the new wallet's
  // identity with the previous account's challenge.
  if (connectedAccount.value && connectedAccount.value !== requestedAddress) {
    throw new Error(tFallback("chat.accountChangedRetry", "Wallet account changed during chat sign-in. Please retry."));
  }

  const signature = String(signed?.signature || signed?.data || "").trim();
  const publicKey =
    normalizePublicKey(signed?.publicKey) ||
    normalizePublicKey(walletService.account?.publicKey) ||
    normalizePublicKey(walletService.account?.pubKey);

  if (!signature || !publicKey) {
    throw new Error(tFallback(
      "chat.missingPublicKey",
      "This wallet connection did not provide the verifiable Neo public key required for NeoChat login.",
    ));
  }

  const session = await chatService.verifyChallenge({
    challengeId: challenge.challengeId,
    address: requestedAddress,
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
