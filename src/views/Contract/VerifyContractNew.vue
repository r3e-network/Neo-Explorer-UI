<template>
  <div class="verify-contract">
    <Container>
      <PageHeader title="Verify Contract" />
      <div class="card">
        <Input v-model="hash" placeholder="Contract Hash" class="mb-4" />
        <Button @click="verify">Verify</Button>
      </div>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'VerifyContractPage',
  data: () => ({ hash: '' }),
  methods: { verify() {} }
}
</script>
