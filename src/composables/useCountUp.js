import { ref, watch, onBeforeUnmount } from "vue";

/**
 * 数字滚动计数器 — 从 0 平滑滚动到目标值
 *
 * @param {import('vue').Ref<number>} targetRef  目标数值 ref
 * @param {object}                   [opts]
 * @param {number}                   [opts.duration=1200]  动画总时长 (ms)
 * @param {number}                   [opts.decimals=0]     小数位数
 * @param {string}                   [opts.easing='easeOut']  缓动类型: easeOut | linear | easeInOut
 * @param {boolean}                  [opts.startOnMount=true]  挂载时自动开始
 * @param {boolean}                  [opts.formatThousands=true] 是否格式化千分位
 * @param {boolean}                  [opts.triggerOnce=false]  只触发一次（再次变化不重新计数）
 * @returns {{ display: import('vue').Ref<string>, animating: import('vue').Ref<boolean>, reset: () => void }}
 */
export function useCountUp(targetRef, opts = {}) {
  const {
    duration = 1200,
    decimals = 0,
    easing = "easeOut",
    startOnMount = true,
    formatThousands = true,
    triggerOnce = false,
  } = opts;

  const display = ref("0");
  const animating = ref(false);
  let rafId = null;
  let startTime = 0;
  let startValue = 0;
  let targetValue = 0;
  let hasTriggered = false;

  const easingFns = {
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    linear: (t) => t,
  };

  const easeFn = easingFns[easing] || easingFns.easeOut;

  function formatValue(val) {
    const fixed = Number(val).toFixed(decimals);
    if (!formatThousands) return fixed;

    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function parseDisplayValue(value) {
    const normalized = String(value || "0").replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeFn(progress);
    const current = startValue + (targetValue - startValue) * eased;

    display.value = formatValue(current);

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      display.value = formatValue(targetValue);
      animating.value = false;
    }
  }

  function start() {
    const val = Number(targetRef?.value ?? 0);
    if (!Number.isFinite(val) || val < 0) {
      display.value = formatValue(0);
      return;
    }

    targetValue = val;
    startValue = parseDisplayValue(display.value);
    startTime = 0;
    animating.value = true;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);
  }

  function reset() {
    hasTriggered = false;
    if (rafId) cancelAnimationFrame(rafId);
    display.value = "0";
    animating.value = false;
  }

  if (startOnMount && targetRef) {
    watch(
      targetRef,
      (val) => {
        if (val === null || val === undefined) return;
        const num = Number(val);
        if (!Number.isFinite(num)) return;
        if (triggerOnce && hasTriggered) return;
        hasTriggered = true;
        start();
      },
      { immediate: true },
    );
  }

  onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  return { display, animating, start, reset };
}
