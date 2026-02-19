<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
    validator: (val) => val.length > 0 && val.every((t) => typeof t.key === "string" && typeof t.label === "string"),
  },
  modelValue: {
    type: String,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: "Content sections",
  },
  idBase: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const tabRefs = ref([]);

function setTabRef(el, index) {
  if (el) tabRefs.value[index] = el;
}

function onArrowKey(direction) {
  const currentIndex = props.tabs.findIndex((t) => t.key === props.modelValue);
  if (currentIndex === -1) return;

  let nextIndex = currentIndex + direction;
  if (nextIndex < 0) nextIndex = props.tabs.length - 1;
  if (nextIndex >= props.tabs.length) nextIndex = 0;

  emit("update:modelValue", props.tabs[nextIndex].key);

  const target = tabRefs.value[nextIndex];
  if (target) target.focus();
}

function onBoundaryKey(toEnd) {
  const index = toEnd ? props.tabs.length - 1 : 0;
  emit("update:modelValue", props.tabs[index].key);

  const target = tabRefs.value[index];
  if (target) target.focus();
}

function tabButtonId(key) {
  return props.idBase ? `${props.idBase}-${key}-tab` : undefined;
}

function tabPanelId(key) {
  return props.idBase ? `${props.idBase}-${key}-panel` : undefined;
}

watch(
  () => props.tabs,
  () => {
    tabRefs.value = [];
  }
);
</script>

<template>
  <div role="tablist" :aria-label="ariaLabel" class="surface-panel flex gap-1 overflow-x-auto p-1">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key"
      :ref="(el) => setTabRef(el, index)"
      type="button"
      :id="tabButtonId(tab.key)"
      role="tab"
      :aria-selected="modelValue === tab.key ? 'true' : 'false'"
      :aria-label="tab.label"
      :aria-controls="tabPanelId(tab.key)"
      :tabindex="modelValue === tab.key ? 0 : -1"
      :class="[
        'relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        modelValue === tab.key
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/35 dark:text-primary-300'
          : 'text-mid hover:bg-white/60 hover:text-high dark:hover:bg-gray-800/70',
      ]"
      @click="$emit('update:modelValue', tab.key)"
      @keydown.left.prevent="onArrowKey(-1)"
      @keydown.right.prevent="onArrowKey(1)"
      @keydown.home.prevent="onBoundaryKey(false)"
      @keydown.end.prevent="onBoundaryKey(true)"
    >
      {{ tab.label }}
      <span v-if="tab.count != null" class="text-low ml-1.5 text-xs">
        ({{ tab.count.toLocaleString() }})
      </span>
      <span
        v-if="modelValue === tab.key"
        class="absolute inset-x-2 bottom-0.5 h-0.5 rounded bg-primary-500"
      />
    </button>
  </div>
</template>
