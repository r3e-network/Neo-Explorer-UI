<template>
  <div class="burn-gas">
    <Container>
      <PageHeader title="GAS Burn Statistics" />
      <Grid cols="cols-3">
        <StatCard label="Total Burned" :value="totalBurned" />
        <StatCard label="Today" :value="todayBurned" />
        <StatCard label="This Week" :value="weekBurned" />
      </Grid>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'BurnGasPage',
  data: () => ({ totalBurned: 0, todayBurned: 0, weekBurned: 0 })
}
</script>
