<template>
  <div
    class="dashboard-stat-card card-tilt gradient-border-card relative overflow-hidden rounded-xl p-5 transition-all duration-300"
    :class="{ 'hover:scale-[1.02]': !noHover }"
  >
    <!-- Background glow dot -->
    <div
      v-if="glowColor"
      class="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl pointer-events-none"
      :style="{ background: glowColor }"
    ></div>

    <div class="relative z-10">
      <!-- Top row: label + icon -->
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-semibold uppercase tracking-[0.08em] text-low">{{ label }}</p>
        <div v-if="icon" class="text-low opacity-60" v-html="icon"></div>
      </div>

      <!-- Value row -->
      <slot name="value">
        <p
          class="min-w-0 font-extrabold leading-tight text-high tabular-nums neon-glow-text [letter-spacing:0]"
          :class="valueSizeClass"
          data-testid="dashboard-stat-value"
        >
          <AnimatedNumber
            v-if="animated && value != null"
            :value="value"
            :decimals="decimals"
            :prefix="prefix"
            :suffix="suffix"
            :duration="1200"
            pop
            neon
          />
          <span v-else>{{ prefix }}{{ formattedValue }}{{ suffix }}</span>
        </p>
      </slot>

      <!-- Subtitle / trend -->
      <div v-if="subtitle || trendValue != null" class="flex items-center gap-1.5 mt-1">
        <span
          v-if="trendValue != null"
          class="inline-flex items-center gap-0.5 text-xs font-semibold"
          :class="trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
        >
          <svg v-if="trendPositive" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          {{ Math.abs(trendValue) }}{{ trendSuffix }}
        </span>
        <span v-if="subtitle" class="text-xs text-low">{{ subtitle }}</span>
      </div>

      <!-- Sparkline -->
      <div v-if="sparklineData && sparklineData.length > 1" class="mt-3">
        <SparklineChart
          :data="sparklineData"
          :width="sparkWidth || 140"
          :height="28"
          :color="sparkColor || (isDark ? '#00E599' : '#00b377')"
          :fill="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import AnimatedNumber from "@/components/common/AnimatedNumber.vue";
import SparklineChart from "@/components/charts/SparklineChart.vue";

const props = defineProps({
  label: { type: String, default: "" },
  value: { type: [Number, String], default: null },
  prefix: { type: String, default: "" },
  suffix: { type: String, default: "" },
  decimals: { type: Number, default: 0 },
  animated: { type: Boolean, default: false },
  subtitle: { type: String, default: "" },
  icon: { type: String, default: "" },
  glowColor: { type: String, default: "" },
  trendValue: { type: Number, default: null },
  trendPositive: { type: Boolean, default: true },
  trendSuffix: { type: String, default: "%" },
  sparklineData: { type: Array, default: null },
  sparkWidth: { type: Number, default: 140 },
  sparkColor: { type: String, default: "" },
  noHover: { type: Boolean, default: false },
});

const isDark = ref(false);
onMounted(() => {
  isDark.value = document.documentElement.classList.contains("dark");
});

const formattedValue = computed(() => {
  if (props.value == null) return "-";
  const n = Number(props.value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  });
});

const valueSizeClass = computed(() => {
  const displayLength = `${props.prefix}${formattedValue.value}${props.suffix}`.length;
  if (displayLength >= 18) return "break-all text-base";
  if (displayLength >= 11) return "break-words text-lg";
  return "text-2xl";
});
</script>
