<template>
  <div v-if="hasTrail" class="agent-tool-trail">
    <template v-if="toolNames.length">
      <button
        type="button"
        class="badge-soft agent-trail-toggle text-[11px] text-mid"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-controls="regionId"
        @click="toggle"
      >
        <span>{{ summaryLabel }}</span>
        <svg
          class="agent-trail-chevron"
          :class="{ 'agent-trail-chevron-open': expanded }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <!-- Kept mounted (v-show, not v-if) so `aria-controls` never dangles. -->
      <div v-show="expanded" :id="regionId" class="agent-trail-body">
        <ol class="agent-trail-list">
          <li
            v-for="(tool, index) in toolNames"
            :key="`${index}-${tool}`"
            class="agent-trail-item font-hash text-xs text-mid"
          >
            <span class="agent-trail-index">{{ index + 1 }}.</span>
            <span class="agent-trail-name">{{ tool }}</span>
          </li>
        </ol>
        <p class="agent-trail-note text-[11px] text-mid">{{ noteLabel }}</p>
        <p v-if="modelName" class="agent-trail-model text-[11px] text-mid">
          <span>{{ modelLabel }}</span>
          <span class="font-hash">{{ modelName }}</span>
        </p>
      </div>
    </template>

    <!-- Model without a tool trail: no toggle to hang the line off, so show it flat. -->
    <p v-else class="agent-trail-model text-[11px] text-mid">
      <span>{{ modelLabel }}</span>
      <span class="font-hash">{{ modelName }}</span>
    </p>
  </div>
</template>

<script setup>
import { computed, ref, useId } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  tools: { type: Array, default: () => [] },
  model: { type: String, default: "" },
});

const { t } = useI18n();

function interpolate(template, params) {
  return Object.keys(params).reduce(
    (text, name) => text.split(`{${name}}`).join(String(params[name])),
    String(template),
  );
}

// The established tf(key, fallback) contract, plus an optional params bag.
// vue-i18n strips an uninterpolated `{n}` from a *found* message, so the
// otherwise-tempting `tf(key, fallback).replace("{n}", n)` silently renders
// "Used  tools" the moment a translation exists. Params must reach t().
const tf = (key, fallback, params = null) => {
  const value = params ? t(key, params) : t(key);
  if (value !== key) return value;
  return params ? interpolate(fallback, params) : fallback;
};

const expanded = ref(false);
const regionId = `agent-tool-trail-${useId()}`;

// Names only — the backend sends no args/results. Never relabel or hide a tool:
// an unrecognized name is still provenance, and a missing row is a lie.
const toolNames = computed(() => {
  const raw = Array.isArray(props.tools) ? props.tools : [];
  return raw
    .map((tool) => (typeof tool === "string" ? tool : String(tool ?? "")).trim())
    .filter((tool) => tool.length > 0);
});

const modelName = computed(() => (typeof props.model === "string" ? props.model.trim() : ""));

const hasTrail = computed(() => toolNames.value.length > 0 || modelName.value.length > 0);

const summaryLabel = computed(() => {
  const count = toolNames.value.length;
  if (count === 1) return tf("agent.toolsUsedOne", "Used 1 tool");
  return tf("agent.toolsUsedMany", "Used {n} tools", { n: count });
});

const noteLabel = computed(() => tf("agent.toolsNote", "Data was fetched with these explorer tools."));

const modelLabel = computed(() => tf("agent.model", "Model"));

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<style scoped>
.agent-tool-trail {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
}

.agent-trail-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  /* WCAG 2.2 SC 2.5.8 — badge-soft's own padding lands under 24px. */
  min-height: 1.5rem;
  padding: 0.125rem 0.5rem;
  cursor: pointer;
}

.agent-trail-chevron {
  height: 0.75rem;
  width: 0.75rem;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.agent-trail-chevron-open {
  transform: rotate(180deg);
}

.agent-trail-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-left: 2px solid var(--line-soft);
  padding-left: 0.625rem;
}

.dark .agent-trail-body {
  border-left-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
}

.agent-trail-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.agent-trail-item {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  word-break: break-word;
}

.agent-trail-index {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.agent-trail-name {
  min-width: 0;
}

.agent-trail-note {
  line-height: 1.35;
}

.agent-trail-model {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.25rem;
  line-height: 1.35;
}

@media (prefers-reduced-motion: reduce) {
  .agent-trail-chevron {
    transition: none;
  }
}
</style>
