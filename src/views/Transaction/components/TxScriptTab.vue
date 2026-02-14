<template>
  <div class="space-y-6">
    <!-- Invocation Script (tx.script) -->
    <ScriptViewer v-if="tx.script" :script="tx.script" label="Invocation Script" />
    <div v-else class="text-sm text-text-secondary dark:text-gray-400">No invocation script available.</div>

    <!-- Witnesses -->
    <template v-if="tx.witnesses && tx.witnesses.length">
      <div v-for="(w, i) in tx.witnesses" :key="'witness-' + i" class="space-y-4">
        <div class="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span
            class="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-text-primary dark:bg-gray-700 dark:text-gray-200"
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
    <div v-else class="text-sm text-text-secondary dark:text-gray-400 mt-4">No witnesses available.</div>
  </div>
</template>

<script setup>
import ScriptViewer from "@/components/trace/ScriptViewer.vue";

defineProps({
  tx: { type: Object, required: true },
});
</script>
