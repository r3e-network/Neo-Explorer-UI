<template>
  <div class="dev-tools">
    <Container>
      <PageHeader title="Developer Tools" />
      <Grid cols="cols-2">
        <div class="card">
          <CardHeader title="Gas Estimator" />
          <Input v-model="script" placeholder="Enter script" />
          <Button @click="estimate">Estimate</Button>
        </div>
        <div class="card">
          <CardHeader title="Unit Converter" />
          <Input v-model="amount" placeholder="Amount" />
        </div>
      </Grid>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'DevTools',
  data: () => ({ script: '', amount: '' }),
  methods: { estimate() {} }
}
</script>
