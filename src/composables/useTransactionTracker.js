import { ref, onUnmounted } from "vue";
import { rpc } from "@/services/api";

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
        const result = await rpc("getapplicationlog", [txid]);
        if (result?.executions?.length) {
          txStatuses.value = {
            ...txStatuses.value,
            [txid]: result.executions[0].vmstate === "HALT" ? "confirmed" : "failed",
          };
          clearInterval(_timers[txid]);
          delete _timers[txid];
          return;
        }
      } catch {
        /* not yet on chain */
      }
      if (attempts >= 8) {
        txStatuses.value = { ...txStatuses.value, [txid]: "unknown" };
        clearInterval(_timers[txid]);
        delete _timers[txid];
      }
    };

    _timers[txid] = setInterval(poll, 15000);
    poll();
  }

  onUnmounted(() => {
    Object.values(_timers).forEach(clearInterval);
  });

  return { txStatuses, track };
}
