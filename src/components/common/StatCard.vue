<template>
  <div
    class="stat-card bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-xl hover:scale-[1.02] hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 group"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between mb-3">
      <div :class="iconWrapperClass">
        <component :is="iconComponent" class="w-6 h-6" />
      </div>
      <div
        v-if="trend"
        :class="trendClass"
        class="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
      >
        <svg
          v-if="trend > 0"
          class="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        {{ Math.abs(trend).toFixed(1) }}%
      </div>
    </div>

    <div class="space-y-1">
      <p
        class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white group-hover:text-primary-500 transition-colors"
      >
        <template v-if="loading">
          <span
            class="inline-block w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          ></span>
        </template>
        <template v-else>
          <slot>{{ formattedValue }}</slot>
        </template>
      </p>
      <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">
        {{ label }}
      </p>
    </div>

    <!-- Decorative gradient -->
    <div
      :class="gradientClass"
      class="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
    ></div>
  </div>
</template>

<script>
import BlockIcon from "@/components/icons/BlockIcon.vue";
import TransactionIcon from "@/components/icons/TransactionIcon.vue";
import ContractIcon from "@/components/icons/ContractIcon.vue";
import AddressIcon from "@/components/icons/AddressIcon.vue";

export default {
  name: "StatCard",
  components: { BlockIcon, TransactionIcon, ContractIcon, AddressIcon },
  props: {
    label: String,
    value: [Number, String],
    icon: { type: String, default: "block" },
    color: { type: String, default: "primary" },
    format: { type: String, default: "number" },
    loading: { type: Boolean, default: false },
    route: String,
    trend: { type: Number, default: null },
  },
  emits: ["click"],

  computed: {
    formattedValue() {
      if (this.format === "number" && typeof this.value === "number") {
        return this.value.toLocaleString();
      }
      return this.value;
    },

    iconComponent() {
      const icons = {
        block: "BlockIcon",
        transaction: "TransactionIcon",
        contract: "ContractIcon",
        address: "AddressIcon",
      };
      return icons[this.icon] || "BlockIcon";
    },

    iconWrapperClass() {
      const colors = {
        primary: "bg-primary-100 dark:bg-primary-900/30 text-primary-500",
        green: "bg-green-100 dark:bg-green-900/30 text-green-500",
        purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-500",
        orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-500",
      };
      return `w-12 h-12 rounded-xl flex items-center justify-center ${
        colors[this.color] || colors.primary
      }`;
    },

    trendClass() {
      return this.trend >= 0
        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    },

    gradientClass() {
      const gradients = {
        primary: "bg-gradient-to-r from-primary-400 to-primary-600",
        green: "bg-gradient-to-r from-green-400 to-green-600",
        purple: "bg-gradient-to-r from-purple-400 to-purple-600",
        orange: "bg-gradient-to-r from-orange-400 to-orange-600",
      };
      return gradients[this.color] || gradients.primary;
    },
  },
};
</script>

<style scoped>
.stat-card {
  position: relative;
  overflow: hidden;
}
</style>
