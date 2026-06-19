<template>
  <span
    class="inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-line-soft"
    :class="[sizeClass, toneClass]"
    :title="label"
  >
    <img
      v-if="currentSrc"
      :src="currentSrc"
      :alt="imageAlt"
      class="h-full w-full rounded-full bg-white object-cover"
      loading="lazy"
      @error="currentSrc = ''"
    />
    <span v-else class="select-none leading-none">{{ initials }}</span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  src: { type: String, default: "" },
  name: { type: String, default: "" },
  symbol: { type: String, default: "" },
  kind: { type: String, default: "token" },
  size: { type: String, default: "md" },
});

const currentSrc = ref(props.src || "");

watch(
  () => props.src,
  (src) => {
    currentSrc.value = src || "";
  },
);

const label = computed(() => props.name || props.symbol || (props.kind === "nft" ? "NFT collection" : "Token"));
const imageAlt = computed(() => `${label.value} logo`);

const initials = computed(() => {
  const source = String(props.symbol || props.name || "").replace(/[^a-z0-9]/gi, "");
  if (source) return source.slice(0, 3).toUpperCase();
  return props.kind === "nft" ? "NFT" : "TOK";
});

const sizeClass = computed(() => {
  if (props.size === "sm") return "h-8 w-8 text-[11px]";
  if (props.size === "lg") return "h-12 w-12 text-sm";
  return "h-10 w-10 text-xs";
});

const palette = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/35 dark:text-sky-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/35 dark:text-violet-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/35 dark:text-teal-200",
];

function hashString(value) {
  return String(value || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

const toneClass = computed(() => {
  const seed = props.symbol || props.name || props.kind;
  return palette[hashString(seed) % palette.length];
});
</script>
