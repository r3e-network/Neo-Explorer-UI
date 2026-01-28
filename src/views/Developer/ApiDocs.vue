<template>
  <div class="api-docs">
    <Container>
      <PageHeader title="API Documentation" />
      <div class="card">
        <h3 class="font-semibold mb-4">Available Methods</h3>
        <ul class="space-y-2">
          <li>GetBlockCount</li>
          <li>GetBlockByBlockHash</li>
          <li>GetTransactionList</li>
        </ul>
      </div>
    </Container>
  </div>
</template>

<script>
export default { name: 'ApiDocs' }
</script>
