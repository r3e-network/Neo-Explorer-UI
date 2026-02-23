<template>
  <div class="relative" ref="langDropdown">
    <button
      class="flex h-6 items-center justify-between rounded-md border border-white/25 bg-white/10 px-2 text-xs text-white transition hover:bg-white/20 uppercase"
      aria-label="Select language"
      aria-haspopup="true"
      :aria-expanded="dropdownOpen"
      @click="dropdownOpen = !dropdownOpen"
    >
      {{ currentLabel }}
    </button>
    <div
      v-show="dropdownOpen"
      class="absolute right-0 top-full mt-1 w-24 rounded-lg border border-white/20 bg-header-bg p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[100] text-white"
    >
      <button
        v-for="lang in supportedLangs"
        :key="lang.value"
        :class="[
          'block w-full text-left rounded px-2 py-1.5 text-xs transition-colors',
          lang.value === currentLang
            ? 'bg-white/15 text-[#00E599] font-semibold'
            : 'text-white/80 hover:bg-white/10 hover:text-white',
        ]"
        @click="selectLang(lang.value)"
      >
        {{ lang.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";

const { locale } = useI18n({ useScope: "global" });

const dropdownOpen = ref(false);
const langDropdown = ref(null);

const supportedLangs = [
  { value: "en", label: "EN" },
  { value: "cn", label: "ZH" },
  { value: "ja", label: "JA" },
  { value: "ko", label: "KO" },
];

const currentLang = computed(() => locale.value);
const currentLabel = computed(() => {
  const ln = supportedLangs.find((l) => l.value === currentLang.value);
  return ln ? ln.label : "EN";
});

function selectLang(val) {
  locale.value = val;
  localStorage.setItem("lang", val);
  dropdownOpen.value = false;
}

function handleClickOutside(e) {
  if (langDropdown.value && !langDropdown.value.contains(e.target)) {
    dropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>
