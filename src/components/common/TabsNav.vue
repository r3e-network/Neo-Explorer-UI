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

watch(
  () => props.tabs,
  () => {
    tabRefs.value = [];
  }
);
</script>

<template>
  <div role="tablist" class="surface-panel flex gap-1 overflow-x-auto p-1">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key"
      :ref="(el) => setTabRef(el, index)"
      role="tab"
      :aria-selected="modelValue === tab.key"
      :aria-label="tab.label"
      :tabindex="modelValue === tab.key ? 0 : -1"
      :class="[
        'relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        modelValue === tab.key
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/35 dark:text-primary-300'
          : 'text-text-secondary hover:bg-white/60 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-800/70 dark:hover:text-gray-200',
      ]"
      @click="$emit('update:modelValue', tab.key)"
      @keydown.left.prevent="onArrowKey(-1)"
      @keydown.right.prevent="onArrowKey(1)"
    >
      {{ tab.label }}
      <span v-if="tab.count != null" class="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
        ({{ tab.count.toLocaleString() }})
      </span>
      <span
        v-if="modelValue === tab.key"
        class="absolute inset-x-2 bottom-0.5 h-0.5 rounded bg-primary-500"
      />
    </button>
  </div>
</template>
