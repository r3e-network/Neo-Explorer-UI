<template>
  <span
    v-if="antiMev"
    class="inline-flex items-center whitespace-nowrap rounded border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300"
    :title="title"
  >
    {{ antiMev.isStructurallyValid ? "Anti-MEV Envelope" : "Envelope-like data" }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  antiMev: { type: Object, default: null },
});

const title = computed(() =>
  props.antiMev?.isStructurallyValid
    ? `Encrypted transaction envelope · DKG round ${props.antiMev.dkgRound}`
    : "Reserved Envelope prefix detected, but the public payload is structurally invalid"
);
</script>
