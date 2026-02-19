<template>
  <div>
    <!-- Boolean toggle -->
    <div v-if="normalizedType === 'Boolean'" class="flex items-center gap-2">
      <button
        type="button"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
        :class="boolValue ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
        role="switch"
        :aria-checked="boolValue"
        :aria-label="`Parameter ${name}`"
        @click="toggle"
      >
        <span
          class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200"
          :class="boolValue ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
      <span class="text-xs text-text-secondary dark:text-gray-400">{{ boolValue }}</span>
    </div>

    <!-- Integer -->
    <input
      v-else-if="normalizedType === 'Integer'"
      type="number"
      :value="modelValue"
      :placeholder="name + ' (Integer)'"
      :aria-label="`Parameter ${name}`"
      class="form-input font-mono"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <!-- Hash160 with validation -->
    <div v-else-if="normalizedType === 'Hash160'" class="relative">
      <input
        type="text"
        :value="modelValue"
        placeholder="0x... or N..."
        :aria-label="`Parameter ${name}`"
        class="form-input font-mono pr-8"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <span
        v-if="modelValue"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
        :class="hash160Valid ? 'text-green-500' : 'text-red-400'"
      >
        {{ hash160Valid ? "✓" : "✗" }}
      </span>
    </div>

    <!-- Hash256 with validation -->
    <div v-else-if="normalizedType === 'Hash256'" class="relative">
      <input
        type="text"
        :value="modelValue"
        placeholder="0x... (64 hex chars)"
        :aria-label="`Parameter ${name}`"
        class="form-input font-mono pr-8"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <span
        v-if="modelValue"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
        :class="hash256Valid ? 'text-green-500' : 'text-red-400'"
      >
        {{ hash256Valid ? "✓" : "✗" }}
      </span>
    </div>

    <!-- Array / Map — JSON textarea -->
    <textarea
      v-else-if="normalizedType === 'Array' || normalizedType === 'Map'"
      :value="modelValue"
      :placeholder="'JSON ' + normalizedType"
      :aria-label="`Parameter ${name}`"
      rows="3"
      class="form-input font-mono text-xs"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <!-- Default: String / ByteArray / PublicKey / Any -->
    <input
      v-else
      type="text"
      :value="modelValue"
      :placeholder="type"
      :aria-label="`Parameter ${name}`"
      class="form-input font-mono"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { isScriptHashHex, strip0x } from "@/utils/neoHelpers";

const props = defineProps({
  modelValue: { type: String, default: "" },
  type: { type: String, default: "String" },
  name: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const normalizedType = computed(() => props.type || "String");
const boolValue = computed(() => props.modelValue === "true" || props.modelValue === "1");

const hash160Valid = computed(() => {
  const v = strip0x(props.modelValue || "");
  return isScriptHashHex(v) || /^N[A-Za-z1-9]{33}$/.test(props.modelValue || "");
});

const hash256Valid = computed(() => /^(0x)?[0-9a-fA-F]{64}$/.test(props.modelValue || ""));

function toggle() {
  emit("update:modelValue", boolValue.value ? "false" : "true");
}
</script>
