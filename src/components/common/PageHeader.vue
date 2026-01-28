<template>
  <div class="page-header">
    <Breadcrumb v-if="breadcrumbs" :items="breadcrumbs" />
    <h1 class="page-title">{{ title }}</h1>
  </div>
</template>

<script>
import Breadcrumb from './Breadcrumb.vue'
export default {
  name: 'PageHeader',
  components: { Breadcrumb },
  props: { title: String, breadcrumbs: Array }
}
</script>

<style scoped>
.page-header { @apply mb-6; }
.page-title { @apply text-2xl font-bold mt-2; }
</style>
