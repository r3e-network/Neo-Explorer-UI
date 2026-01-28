<template>
  <div class="not-found">
    <Container>
      <div class="text-center py-20">
        <h1 class="text-6xl font-bold text-gray-300">404</h1>
        <p class="text-gray-500 mt-4">Page not found</p>
        <router-link to="/" class="btn btn-primary mt-6">
          Go Home
        </router-link>
      </div>
    </Container>
  </div>
</template>

<script>
export default { name: 'NotFound' }
</script>
