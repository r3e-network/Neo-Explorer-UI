<template>
  <div
    v-if="request"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
  >
    <div
      class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]"
    >
      <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              ></path>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-high tracking-tight">Proposal Details JSON</h2>
        </div>
        <button
          @click="$emit('close')"
          aria-label="Close"
          class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6 overflow-y-auto font-mono text-xs text-mid whitespace-pre-wrap bg-surface-muted shadow-inner">
        {{ JSON.stringify(request, null, 2) }}
        <div v-if="request?.params?.unsigned_tx" class="mt-6 whitespace-normal font-sans">
          <UnsignedTransactionViewer
            :transaction-hex="request.params.unsigned_tx"
            label="Unsigned Transaction Packet"
            description="Decoded transaction envelope and embedded execution script for this proposal."
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import UnsignedTransactionViewer from "@/components/trace/UnsignedTransactionViewer.vue";

defineProps({
  request: { type: Object, default: null },
});

defineEmits(["close"]);
</script>
