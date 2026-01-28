<template>
  <div class="chart-card card">
    <h3 class="font-semibold mb-4">{{ title }}</h3>
    <div ref="chart" class="h-64"></div>
  </div>
</template>

<script>
export default {
  name: 'LineChart',
  props: {
    title: String,
    data: Array
  }
}
</script>
