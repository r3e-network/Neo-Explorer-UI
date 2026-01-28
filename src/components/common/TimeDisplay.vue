<template>
  <time :datetime="iso" :title="full">{{ display }}</time>
</template>

<script>
export default {
  name: "TimeDisplay",
  props: { timestamp: [Number, String] },
  computed: {
    date() {
      return new Date(Number(this.timestamp));
    },
    iso() {
      return this.date.toISOString();
    },
    full() {
      return this.date.toLocaleString();
    },
    display() {
      const diff = Date.now() - this.date.getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60) return `${s}s ago`;
      if (s < 3600) return `${Math.floor(s / 60)}m ago`;
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
      return `${Math.floor(s / 86400)}d ago`;
    },
  },
};
</script>
