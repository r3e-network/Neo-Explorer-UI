<template>
  <ErrorState
    v-if="failed"
    :title="title || undefined"
    :message="message || undefined"
    :show-retry="true"
    @retry="reset"
  />
  <slot v-else />
</template>

<script setup>
import { onErrorCaptured, ref } from "vue";
import ErrorState from "@/components/common/ErrorState.vue";

// Reusable render-error boundary. Without an onErrorCaptured boundary, a single
// throw during render/setup of any descendant unmounts the whole subtree (a
// blank region with no recovery). This catches it, reports to telemetry via the
// global capture hook (set in main.js), and shows a recoverable fallback.
const props = defineProps({
  // Optional override copy.
  title: { type: String, default: "" },
  message: { type: String, default: "" },
  // A label so telemetry can tell which boundary fired.
  boundary: { type: String, default: "unnamed" },
});

const emit = defineEmits(["error", "reset"]);

const failed = ref(false);

function reset() {
  failed.value = false;
  emit("reset");
}

onErrorCaptured((error) => {
  failed.value = true;
  emit("error", error);
  try {
    if (typeof globalThis !== "undefined" && typeof globalThis.__neoExplorerCaptureError__ === "function") {
      globalThis.__neoExplorerCaptureError__(error, { source: "error-boundary", boundary: props.boundary });
    }
  } catch {
    // never let reporting throw out of the boundary
  }
  // Returning false stops the error from propagating further up (we have
  // rendered a fallback for this subtree).
  return false;
});
</script>
