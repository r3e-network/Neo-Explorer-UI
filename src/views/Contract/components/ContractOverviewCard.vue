<template>
  <div class="etherscan-card">
    <div class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Overview</h2>
    </div>
    <div class="divide-y divide-card-border dark:divide-card-border-dark">
      <InfoRow
        label="Contract Hash"
        tooltip="The unique identifier for this smart contract"
        :value="contract.hash || '-'"
        :copyable="!!contract.hash"
        :copy-value="contract.hash"
      />
      <InfoRow label="Name" :value="contract.name || '-'" />
      <InfoRow label="Creator" tooltip="The address that deployed this contract">
        <router-link
          v-if="contract.creator"
          :to="`/account-profile/${contract.creator}`"
          class="break-all font-mono text-sm etherscan-link"
        >
          {{ contract.creator }}
        </router-link>
        <span v-else class="text-text-secondary">-</span>
      </InfoRow>
      <InfoRow label="Invocations" :value="formatNumber(contract.invocations)" />
      <InfoRow
        label="Update Counter"
        tooltip="Number of times this contract has been updated"
        :value="String(contract.updatecounter ?? 0)"
      />
      <InfoRow label="Verified">
        <span v-if="isVerified" class="inline-flex items-center gap-1 text-sm text-success">
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          Yes
        </span>
        <span v-else class="text-sm text-text-secondary">No</span>
      </InfoRow>
      <InfoRow v-if="supportedStandards.length" label="Supported Standards">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="std in supportedStandards"
            :key="'ov-' + std"
            class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            :class="nepBadgeClass(std)"
          >
            {{ std }}
          </span>
        </div>
      </InfoRow>
      <InfoRow label="Methods Count" tooltip="Number of methods in the contract ABI" :value="String(methodsCount)" />
      <InfoRow label="Events Count" tooltip="Number of events in the contract ABI" :value="String(eventsCount)" />
    </div>
  </div>
</template>

<script setup>
import { formatNumber } from "@/utils/explorerFormat";
import { nepBadgeClass } from "@/utils/nepBadges";
import InfoRow from "@/components/common/InfoRow.vue";

defineProps({
  contract: { type: Object, required: true },
  isVerified: { type: Boolean, default: false },
  supportedStandards: { type: Array, default: () => [] },
  methodsCount: { type: Number, default: 0 },
  eventsCount: { type: Number, default: 0 },
});
</script>
