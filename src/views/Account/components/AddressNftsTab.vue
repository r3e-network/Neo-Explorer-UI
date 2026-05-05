<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 5" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" :title="$t('addressDetail.nftsError')" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!assets.length"
      :message="$t('addressDetail.nftsEmptyTitle')"
      :description="$t('addressDetail.nftsEmptyDesc')"
    />

    <div v-else class="surface-panel overflow-x-auto">
      <table class="w-full min-w-[700px]" :aria-label="$t('addressDetail.nftsTableAria')">
        <caption class="sr-only">
          {{ $t('addressDetail.nep11TableCaption') }}
        </caption>
        <thead class="table-head">
          <tr>
            <th scope="col" class="table-header-cell">{{ $t("addressDetail.colCollection") }}</th>
            <th scope="col" class="table-header-cell">{{ $t("addressDetail.colStandard") }}</th>
            <th scope="col" class="table-header-cell-right">{{ $t("addressDetail.colBalance") }}</th>
            <th scope="col" class="table-header-cell">{{ $t("addressDetail.colContract") }}</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="asset in assets"
            :key="assetKey(asset)"
            class="list-row group"
          >
            <td class="table-cell font-medium">
              {{ assetDisplayName(asset) }}
            </td>
            <td class="table-cell-secondary">
              {{ assetStandard(asset) }}
            </td>
            <td class="table-cell-right">
              {{ assetBalance(asset) }}
            </td>
            <td class="table-cell">
              <router-link
                v-if="assetHash(asset)"
                :to="assetTokenRoute(asset)"
                class="font-hash etherscan-link"
              >
                {{ truncateHash(assetHash(asset), 12, 8) }}
              </router-link>
              <span v-else class="text-low">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { truncateHash } from "@/utils/explorerFormat";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

defineProps({
  assets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

defineEmits(["retry"]);

const { t } = useI18n();

function assetHash(asset) {
  return asset?.hash || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
}

function assetStandard(asset) {
  return String(asset?.standard || asset?.type || t("addressDetail.unknownAsset"));
}

function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || t("addressDetail.unknownAsset");
}

function assetBalance(asset) {
  const raw = asset?.balance ?? asset?.amount ?? asset?.quantity ?? asset?.totalbalance;
  if (raw === undefined || raw === null || raw === "") return "-";
  const num = Number(raw);
  if (Number.isFinite(num)) return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
  return String(raw);
}

function assetTokenRoute(asset) {
  const hash = assetHash(asset);
  const standard = assetStandard(asset).toUpperCase();
  if (standard.includes("NEP11")) return `/nft-token-info/${hash}`;
  return `/nep17-token-info/${hash}`;
}

function assetKey(asset) {
  return `${assetHash(asset)}-${assetDisplayName(asset)}-${assetBalance(asset)}`;
}
</script>
