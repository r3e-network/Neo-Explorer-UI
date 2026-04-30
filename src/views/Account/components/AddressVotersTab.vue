<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 6" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" :title="$t('addressDetail.votersError')" :message="error" @retry="$emit('goToPage', 1)" />

    <EmptyState
      v-else-if="!voters.length"
      :message="$t('addressDetail.votersEmptyTitle')"
      :description="$t('addressDetail.votersEmptyDesc')"
    />

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-mid text-sm">
          {{
            $t("addressDetail.votersCountLine", {
              count: voters.length,
              total: formatNumber(totalCount),
            })
          }}
        </p>
      </div>

      <div class="overflow-x-auto rounded-xl border border-line-soft bg-surface-base shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-surface-elevated text-mid border-b border-line-soft">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">{{ $t("addressDetail.colVoterAddress") }}</th>
              <th class="px-4 py-3 text-right font-semibold">{{ $t("addressDetail.colVotes") }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line-soft">
            <tr v-for="voter in voters" :key="voter.voter" class="hover:bg-surface-hover/50 transition-colors">
              <td class="px-4 py-3 font-medium">
                <HashLink :hash="voter.voterAddress" type="address" :truncated="false" />
              </td>
              <td class="px-4 py-3 text-right text-high font-medium">
                {{ formatNumber(voter.balanceOfVoter) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EtherscanPagination
        :page="page"
        :total-pages="totalPages"
        :page-size="pageSize"
        :total="totalCount"
        @update:page="$emit('goToPage', $event)"
        @update:page-size="$emit('changePageSize', $event)"
      />
    </div>
  </section>
</template>

<script setup>
import { formatNumber } from "@/utils/explorerFormat";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

defineProps({
  address: { type: String, required: true },
  voters: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  totalCount: { type: Number, default: 0 },
});

defineEmits(["goToPage", "changePageSize", "retry"]);
</script>