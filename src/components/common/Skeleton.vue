<template>
  <div :class="skeletonClass" :style="customStyle"></div>
</template>

<script>
export default {
  name: 'Skeleton',
  props: {
    width: { type: String, default: '100%' },
    height: { type: String, default: '20px' },
    variant: { 
      type: String, 
      default: 'text',
      validator: v => ['text', 'circular', 'rectangular', 'rounded'].includes(v)
    },
    animation: {
      type: String,
      default: 'pulse',
      validator: v => ['pulse', 'wave', 'none'].includes(v)
    }
  },
  computed: {
    skeletonClass() {
      const base = 'skeleton bg-gray-200 dark:bg-gray-700'
      const variants = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-lg'
      }
      const animations = {
        pulse: 'animate-pulse',
        wave: 'skeleton-wave',
        none: ''
      }
      return `${base} ${variants[this.variant]} ${animations[this.animation]}`
    },
    customStyle() {
      return { width: this.width, height: this.height }
    }
  }
}
</script>

<style scoped>
.skeleton-wave {
  position: relative;
  overflow: hidden;
}
.skeleton-wave::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: wave 1.5s infinite;
}
@keyframes wave {
  100% { transform: translateX(100%); }
}
</style>
