<template>
  <div class="latest-blocks card">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-semibold">{{ $t("homePage.recentBlocks") }}</h3>
      <router-link to="/blocks/1" class="text-sm text-primary-500">
        {{ $t("homePage.seeAll") }} →
      </router-link>
    </div>
    <div class="space-y-2">
      <BlockListItem v-for="b in blocks" :key="b.hash" :block="b" />
    </div>
  </div>
</template>

<script>
import BlockListItem from "./BlockListItem.vue";
export default {
  name: "LatestBlocks",
  components: { BlockListItem },
  props: { blocks: Array },
};
</script>
