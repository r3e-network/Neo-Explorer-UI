<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="$emit('close')"
  >
    <div class="panel-muted mx-4 w-full max-w-md p-6 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-high text-sm font-semibold">WalletConnect</h3>
        <button class="text-low transition-colors hover:text-high" @click="$emit('close')">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="text-mid mb-3 text-xs">
        Copy this URI and paste it into your WalletConnect-compatible wallet.
      </p>
      <div class="flex items-center gap-2">
        <input :value="uri" readonly class="form-input flex-1 font-mono text-xs" @focus="$event.target.select()" />
        <button
          class="shrink-0 rounded-md bg-primary-500 px-3 py-2 text-xs font-medium text-white hover:bg-primary-600"
          @click="copyUri"
        >
          {{ copied ? "Copied" : "Copy" }}
        </button>
      </div>
      <p class="text-mid mt-4 flex items-center gap-2 text-xs">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Waiting for wallet approval...
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  uri: { type: String, required: true },
  visible: { type: Boolean, default: false },
});

defineEmits(["close"]);

const copied = ref(false);

function copyUri() {
  navigator.clipboard.writeText(props.uri).catch(() => {});
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>
