import { ref, onUnmounted } from "vue";
import { rpc } from "@/services/api";
import { extractVmStateFromAppLog } from "@/utils/txVmState";
import { getNetworkRefreshIntervalMs } from "@/utils/env";

const MAX_POLL_ATTEMPTS = 8;

function isMethodNotFoundError(error) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("method not found") || msg.includes("-32601");
}

async function fetchApplicationLog(txid) {
  // Standard `getapplicationlog` is the canonical chain source — works
  // against any Neo node and outlives Mongo cleanup. Was previously
  // calling PascalCase GetApplicationLogByTransactionHash first which
  // proxies through neo3fura_http (#180 / #185).
  try {
    return await rpc("getapplicationlog", [txid]);
  } catch (error) {
    if (!isMethodNotFoundError(error)) throw error;
    return rpc("GetApplicationLogByTransactionHash", { TransactionHash: txid });
  }
}

function getTxStatusFromApplicationLog(result) {
  const vmState = extractVmStateFromAppLog(result);
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

    _timers[txid] = setInterval(poll, getNetworkRefreshIntervalMs());
    poll();
  }

  onUnmounted(() => {
    Object.values(_timers).forEach(clearInterval);
  });

  return { txStatuses, track };
}
