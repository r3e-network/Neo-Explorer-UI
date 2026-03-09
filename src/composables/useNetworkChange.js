import { onBeforeUnmount, onMounted } from "vue";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";

export function useNetworkChange(handler) {
  if (typeof handler !== "function") return;

  onMounted(() => {
    if (typeof window === "undefined") return;
    window.addEventListener(NETWORK_CHANGE_EVENT, handler);
  });

  onBeforeUnmount(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener(NETWORK_CHANGE_EVENT, handler);
  });
}
