<template>
  <div class="space-y-6">
    <!-- Invocation Script (tx.script) -->
    <ScriptViewer v-if="tx.script" :script="tx.script" label="Invocation Script" />
    <div v-else class="panel-muted text-mid px-4 py-3 text-sm">No invocation script available.</div>

    <!-- Witnesses -->
    <template v-if="tx.witnesses && tx.witnesses.length">
      <div v-for="(w, i) in tx.witnesses" :key="'witness-' + i" class="space-y-4">
        <div class="soft-divider flex items-center gap-2 border-t pt-4">
          <span
            class="badge-soft rounded px-2 py-1 text-xs font-semibold text-high"
          >
            Witness {{ i + 1 }}
          </span>
        </div>
        <ScriptViewer v-if="w.invocation" :script="w.invocation" :label="`Witness ${i + 1} — Invocation Script`" />
        <ScriptViewer
          v-if="w.verification"
          :script="w.verification"
          :label="`Witness ${i + 1} — Verification Script`"
        />
      </div>
    </template>
    <div v-else class="panel-muted text-mid mt-4 px-4 py-3 text-sm">No witnesses available.</div>
  </div>
</template>

<script setup>
import ScriptViewer from "@/components/trace/ScriptViewer.vue";

defineProps({
  tx: { type: Object, required: true },
});
</script>
