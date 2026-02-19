import { ref, onUnmounted } from "vue";
import { rpc } from "@/services/api";

const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 15000;

function isMethodNotFoundError(error) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("method not found") || msg.includes("-32601");
}

async function fetchApplicationLog(txid) {
  try {
    return await rpc("GetApplicationLogByTransactionHash", { TransactionHash: txid });
  } catch (error) {
    // Some deployments proxy native RPC methods but do not expose the indexed method.
    if (!isMethodNotFoundError(error)) throw error;
    return rpc("getapplicationlog", [txid]);
  }
}

function getTxStatusFromApplicationLog(result) {
  const vmState = result?.executions?.[0]?.vmstate;
  if (!vmState) return null;
  return vmState === "HALT" ? "confirmed" : "failed";
}

/**
 * Composable that polls for transaction confirmation after write tx submission.
 */
export function useTransactionTracker() {
  const txStatuses = ref({});
  const _timers = {};

  function track(txid) {
    if (!txid || txStatuses.value[txid]) return;
    txStatuses.value[txid] = "pending";
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const result = await fetchApplicationLog(txid);
        const status = getTxStatusFromApplicationLog(result);
        if (status) {
          txStatuses.value = {
            ...txStatuses.value,
            [txid]: status,
          };
          clearInterval(_timers[txid]);
          delete _timers[txid];
          return;
        }
      } catch {
        /* not yet on chain */
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        txStatuses.value = { ...txStatuses.value, [txid]: "unknown" };
        clearInterval(_timers[txid]);
        delete _timers[txid];
      }
    };

    _timers[txid] = setInterval(poll, POLL_INTERVAL_MS);
    poll();
  }

  onUnmounted(() => {
    Object.values(_timers).forEach(clearInterval);
  });

  return { txStatuses, track };
}
