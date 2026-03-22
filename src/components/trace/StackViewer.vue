<template>
  <div class="stack-viewer">
    <div v-if="!stack || stack.length === 0" class="text-mid py-2 text-sm italic">
      No stack items
    </div>
    <div v-else class="space-y-1">
      <!-- index key is acceptable: stack items have no unique ID and list is not reordered -->
      <div
        v-for="(item, index) in stack"
        :key="index"
        class="stack-item panel-muted"
      >
        <button
          class="list-row w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
          aria-label="Toggle stack item details"
          @click="toggle(index)"
        >
          <svg
            v-if="isExpandable(item)"
            class="text-low h-3.5 w-3.5 flex-shrink-0 transition-transform"
            :class="{ 'rotate-90': expanded[index] }"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clip-rule="evenodd"
            />
          </svg>
          <span v-else class="w-3.5 flex-shrink-0"></span>

          <span class="type-badge px-1.5 py-0.5 rounded text-xs font-medium" :class="typeBadgeClass(item.type)">
            {{ item.type ?? "Unknown" }}
          </span>

          <span class="text-high truncate font-mono text-xs">
            {{ formatPreview(item) }}
          </span>
        </button>

        <div v-if="expanded[index] && isExpandable(item)" class="px-3 pb-3 pt-1">
          <!-- Nested Array -->
          <template v-if="item.type === 'Array'">
            <StackViewer :stack="item.value" />
          </template>

          <!-- Nested Map -->
          <template v-else-if="item.type === 'Map'">
            <div
              v-for="(entry, mi) in item.value"
              :key="mi"
              class="soft-divider flex gap-2 border-b py-1 last:border-0"
            >
              <span class="text-mid shrink-0 text-xs font-medium">Key:</span>
              <span class="text-high font-mono text-xs">{{ formatMapKey(entry.key) }}</span>
              <span class="text-low mx-1 text-xs">-></span>
              <span class="text-high truncate font-mono text-xs">{{
                formatMapValue(entry.value)
              }}</span>
            </div>
          </template>

          <!-- ByteString / Buffer detail -->
          <template v-else-if="item.type === 'ByteString' || item.type === 'Buffer'">
            <div class="space-y-1.5 text-xs font-mono">
              <div class="flex gap-2">
                <span class="text-mid shrink-0">Hex:</span>
                <span class="text-high break-all">{{ toHex(item.value) }}</span>
              </div>
              <div class="flex gap-2">
                <span class="text-mid shrink-0">UTF-8:</span>
                <span class="text-high break-all">{{ tryUtf8(item.value) }}</span>
              </div>
              <div v-if="isNeoAddress(item.value)" class="flex gap-2">
                <span class="text-primary-500 flex-shrink-0">Address:</span>
                <span class="text-primary-600 dark:text-primary-400">{{ decodeAddress(item.value) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { scriptHashToAddress, base64ToHex, base64ToUtf8, isScriptHash } from "@/utils/neoCodec";

defineProps({
  stack: {
    type: Array,
    required: true,
  },
});

const expanded = reactive({});

function toggle(index) {
  expanded[index] = !expanded[index];
}

function isExpandable(item) {
  if (!item) return false;
  return ["Array", "Map", "ByteString", "Buffer"].includes(item.type);
}

function typeBadgeClass(type) {
  const map = {
    Integer: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    Boolean: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    ByteString: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Buffer: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Array: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    Map: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  };
  return map[type] ?? "badge-soft";
}

function formatPreview(item) {
  if (!item) return "null";
  switch (item.type) {
    case "Integer":
      return item.value ?? "0";
    case "Boolean":
      return item.value ? "true" : "false";
    case "ByteString":
    case "Buffer": {
      if (!item.value) return '""';
      const hex = toHex(item.value);
      return hex.length > 32 ? `${hex.slice(0, 32)}...` : hex;
    }
    case "Array":
      return `[${(item.value ?? []).length} items]`;
    case "Map":
      return `{${(item.value ?? []).length} entries}`;
    default:
      return String(item.value ?? "");
  }
}

function toHex(base64Str) {
  if (!base64Str) return "";
  return base64ToHex(base64Str);
}

function tryUtf8(base64Str) {
  if (!base64Str) return "";
  return base64ToUtf8(base64Str) || "(not valid UTF-8)";
}

function isNeoAddress(base64Str) {
  return isScriptHash(base64Str);
}

function decodeAddress(base64Str) {
  return scriptHashToAddress(base64Str) || base64ToHex(base64Str);
}

function formatMapKey(key) {
  if (!key) return "null";
  if (typeof key === "object") return formatPreview(key);
  return String(key);
}

function formatMapValue(value) {
  if (!value) return "null";
  if (typeof value === "object") return formatPreview(value);
  return String(value);
}
</script>
