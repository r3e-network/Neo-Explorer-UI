<template>
  <div class="contract-detail-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6">
      <nav class="mb-4 flex items-center text-sm text-text-secondary dark:text-gray-400">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/contracts/1" class="hover:text-primary-500">Contracts</router-link>
        <span class="mx-2">/</span>
        <span class="text-text-primary dark:text-gray-300">{{ contract.name || "Contract" }}</span>
      </nav>

      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold text-text-primary dark:text-gray-100">
              {{ contract.name || "Unknown Contract" }}
            </h1>
            <span
              v-if="isVerified"
              class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-success dark:border-emerald-800 dark:bg-emerald-900/30"
            >
              <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
              Verified
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-text-secondary dark:text-gray-400">{{
              truncateHash(contract.hash, 12, 8)
            }}</span>
            <button @click="copyHash" class="text-gray-400 hover:text-primary-500">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="mb-6 etherscan-card">
        <div class="border-b border-card-border p-4 dark:border-card-border-dark">
          <h2 class="font-semibold text-text-primary dark:text-gray-100">Overview</h2>
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
              :to="`/accountprofile/${contract.creator}`"
              class="break-all font-mono text-sm etherscan-link"
            >
              {{ contract.creator }}
            </router-link>
            <span v-else class="text-text-secondary">-</span>
          </InfoRow>
          <InfoRow label="Invocations" :value="formatNumber(contract.invocations)" />
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
        </div>
      </div>

      <div class="etherscan-card">
        <div class="border-b border-card-border dark:border-card-border-dark">
          <nav class="flex flex-wrap">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="border-b-2 px-4 py-3 text-sm font-medium transition-colors"
              :class="
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-500 dark:text-primary-400'
                  : 'border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-4 md:p-5">
          <div v-if="!contract.hash" class="py-8 text-center text-text-secondary dark:text-gray-400">
            Loading contract details...
          </div>

          <div v-else-if="activeTab === 'transactions'">
            <ScCallTable :key="`sc-${contract.hash}`" :contract-hash="contract.hash" />
          </div>

          <div v-else-if="activeTab === 'code'" class="space-y-4">
            <div
              class="flex flex-col gap-3 rounded-md border border-card-border bg-gray-50 p-3 dark:border-card-border-dark dark:bg-gray-800/40 md:flex-row md:items-center md:justify-between"
            >
              <p class="text-sm text-text-secondary dark:text-gray-300">
                Verified source files and contract artifacts.
              </p>
              <router-link
                :to="sourceCodeLocation"
                class="inline-flex items-center justify-center rounded border border-card-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 dark:border-card-border-dark dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Open Full Source Page
              </router-link>
            </div>

            <ContractSourceCodePanel
              :key="`source-${contract.hash}-${contract.updatecounter || 0}`"
              :contract-hash="contract.hash"
              :updatecounter="contract.updatecounter || 0"
              :show-toolbar="true"
              :compact="true"
            />
          </div>

          <div v-else>
            <EventsTable :key="`events-${contract.hash}`" :contract-hash="contract.hash" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { contractService } from "@/services";
import { truncateHash } from "@/utils/explorerFormat";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
import InfoRow from "@/components/common/InfoRow.vue";
import ScCallTable from "@/views/Contract/ScCallTable.vue";
import EventsTable from "@/views/Contract/EventsTable.vue";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";

export default {
  name: "ContractDetailNew",
  components: {
    InfoRow,
    ScCallTable,
    EventsTable,
    ContractSourceCodePanel,
  },
  data() {
    return {
      contract: {},
      loading: false,
      activeTab: "transactions",
      tabs: getContractDetailTabs(),
      isVerified: false,
    };
  },
  computed: {
    sourceCodeLocation() {
      return buildSourceCodeLocation(this.contract.hash, this.contract.updatecounter || 0);
    },
  },
  watch: {
    "$route.params.hash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadContract(hash);
      },
    },
  },
  methods: {
    async loadContract(hash) {
      this.loading = true;
      try {
        this.contract = (await contractService.getByHash(hash)) || {};

        // Check verification status
        try {
          const verified = await contractService.getVerifiedByHash(hash, this.contract.updatecounter || 0);
          this.isVerified = !!(verified && verified.hash);
        } catch {
          this.isVerified = false;
        }
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },
    copyHash() {
      if (this.contract?.hash) navigator.clipboard.writeText(this.contract.hash);
    },
    truncateHash,
    formatNumber(value) {
      return Number(value || 0).toLocaleString();
    },
  },
};
</script>
