<template>
  <div class="nft-gallery">
    <Container>
      <PageHeader title="NFT Gallery" />
      <Grid cols="cols-4">
        <div v-for="nft in nfts" :key="nft.id" class="card">
          <img :src="nft.image" class="w-full rounded" />
          <p class="mt-2 font-medium">{{ nft.name }}</p>
        </div>
      </Grid>
    </Container>
  </div>
</template>

<script>
export default {
  name: 'NftGallery',
  data: () => ({ nfts: [] })
}
</script>
