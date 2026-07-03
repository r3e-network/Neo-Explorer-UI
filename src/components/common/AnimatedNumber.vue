<script setup>
import { computed } from "vue";
import { useCountUp } from "@/composables/useCountUp";

const props = defineProps({
  /** 目标数值 */
  value: { type: [Number, String], default: 0 },
  /** 动画时长 (ms) */
  duration: { type: Number, default: 1200 },
  /** 小数位数 */
  decimals: { type: Number, default: 0 },
  /** 是否格式化千分位 */
  formatThousands: { type: Boolean, default: true },
  /** 是否在挂载时自动开始 */
  startOnMount: { type: Boolean, default: true },
  /** 缓动类型 */
  easing: { type: String, default: "easeOut" },
  /** 是否启用霓虹发光效果 */
  neon: { type: Boolean, default: false },
  /** 是否添加弹出动画 */
  pop: { type: Boolean, default: true },
  /** 前缀 (如 "$" / "≈ ") */
  prefix: { type: String, default: "" },
  /** 后缀 (如 " NEO" / " GAS") */
  suffix: { type: String, default: "" },
});

const targetRef = computed(() => Number(props.value) || 0);

const { display, animating } = useCountUp(targetRef, {
  duration: props.duration,
  decimals: props.decimals,
  easing: props.easing,
  formatThousands: props.formatThousands,
  startOnMount: props.startOnMount,
});
</script>

<template>
  <span
    class="inline-flex items-baseline"
    :class="{
      'neon-glow-text': neon && animating,
      'number-animate-in': pop && !animating,
    }"
  >
    <span v-if="prefix" class="text-[0.7em] opacity-70 mr-0.5">{{ prefix }}</span>
    <span>{{ display }}</span>
    <span v-if="suffix" class="text-[0.6em] opacity-60 ml-0.5 font-medium">{{ suffix }}</span>
  </span>
</template>
