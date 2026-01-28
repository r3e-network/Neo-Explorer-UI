<template>
  <div class="charts-page">
    <Container>
      <PageHeader title="Charts & Statistics" />
      <Grid cols="cols-2">
        <div class="card">
          <CardHeader title="Daily Transactions" />
          <div class="h-64"><!-- Chart here --></div>
        </div>
        <div class="card">
          <CardHeader title="Active Addresses" />
          <div class="h-64"><!-- Chart here --></div>
        </div>
      </Grid>
    </Container>
  </div>
</template>

<script>
export default { name: 'ChartsPage' }
</script>
