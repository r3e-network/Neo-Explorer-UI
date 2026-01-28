<template>
  <div class="dropdown" :class="{ open }">
    <button @click="open = !open" class="dropdown-trigger">
      <slot name="trigger">{{ label }}</slot>
    </button>
    <div v-if="open" class="dropdown-menu">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dropdown',
  props: { label: String },
  data: () => ({ open: false })
}
</script>

<style scoped>
.dropdown { @apply relative; }
.dropdown-menu {
  @apply absolute top-full right-0 mt-1 bg-white rounded-lg shadow-dropdown 
         min-w-[160px] py-1 z-50;
}
</style>
