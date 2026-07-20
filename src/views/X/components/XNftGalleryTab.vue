<template>
  <div>
    <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div v-for="i in 10" :key="i" class="etherscan-card overflow-hidden p-0">
        <Skeleton height="140px" variant="rounded" />
        <div class="space-y-2 p-3">
          <Skeleton width="40%" height="14px" />
          <Skeleton width="70%" height="14px" />
        </div>
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadInventoryError', 'Unable to load NFT inventory.')"
      @retry="refresh"
    />

    <EmptyState v-else-if="items.length === 0" :message="tf('neoX.noNftItems', 'No NFT items')" icon="token" />

    <template v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div v-for="(instance, i) in items" :key="instance.id ?? i" class="etherscan-card overflow-hidden p-0">
          <img
            v-if="instance.imageUrl && !failedImages.has(imageKey(instance, i))"
            :src="instance.imageUrl"
            :alt="instance.metadata?.name || `#${instance.id}`"
            class="aspect-square w-full object-cover"
            loading="lazy"
            @error="failedImages.add(imageKey(instance, i))"
          />
          <div v-else class="bg-surface-glass flex aspect-square w-full items-center justify-center text-low">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M3 3l18 18M10.5 10.5A2 2 0 0013 13m-8.6 3.4L9 12l2 2m2-2l1-1 5 5M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H9M5 5a2 2 0 00-2 2v10"
              />
            </svg>
          </div>
          <div class="p-3">
            <p class="font-hash text-xs text-mid">#{{ instance.id ?? "—" }}</p>
            <p v-if="instance.metadata?.name" class="mt-0.5 truncate text-sm text-high" :title="instance.metadata.name">
              {{ instance.metadata.name }}
            </p>
            <div v-if="instance.owner?.hash" class="mt-1 text-xs">
              <span class="text-low">{{ tf("neoX.owner", "Owner") }}</span>
              <XHashLink
                class="ml-1"
                type="address"
                :hash="instance.owner.hash"
                :name="instance.owner.name || ''"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="soft-divider mt-4 border-t px-4 py-3">
        <InfiniteScroll :auto="false" :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { tokenService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

const props = defineProps({
  hash: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  tokenService.getInstances(props.hash, { net: getNeoxNet(), cursor, signal: ctx.signal })
);

// Instances whose image failed to load fall back to the placeholder tile.
const failedImages = reactive(new Set());
const imageKey = (instance, i) => `${instance.id ?? i}`;
</script>
