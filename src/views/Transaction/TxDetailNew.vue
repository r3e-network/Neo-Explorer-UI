<template>
  <div class="tx-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-text-secondary dark:text-gray-400 mb-4">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/transactions/1" class="hover:text-primary-500">Transactions</router-link>
        <span class="mx-2">/</span>
        <span class="text-text-primary dark:text-gray-300 truncate max-w-[200px]">{{ truncateHash }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="statusBgClass">
          <svg class="w-6 h-6" :class="statusIconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="isSuccess"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-primary dark:text-white">Transaction Details</h1>
          <StatusBadge :status="txStatus" />
        </div>
      </div>

      <!-- Transaction Action Summary -->
      <div
        v-if="!loading && tx.hash && actionSummary"
        class="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
      >
        <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-sm text-blue-800 dark:text-blue-300">{{ actionSummary }}</p>
      </div>

      <!-- Complex Transaction Banner -->
      <div
        v-if="!loading && isComplexTx"
        class="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
      >
        <div class="flex items-center gap-2">
          <svg class="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-medium text-amber-800 dark:text-amber-300">
            Complex transaction involving multiple contracts.
          </span>
        </div>
        <button
          class="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          @click="activeTab = 'trace'"
        >
          View Execution Trace &rarr;
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div class="etherscan-card p-6">
          <div class="animate-pulse space-y-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" v-for="i in 8" :key="i"></div>
          </div>
        </div>
      </div>

      <!-- Tabbed Content -->
      <div v-else class="etherscan-card">
        <!-- Tab Navigation -->
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
              <span
                v-if="tab.count != null"
                class="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700"
                >{{ tab.count }}</span
              >
            </button>
          </nav>
        </div>

        <div class="p-4 md:p-5">
          <!-- ==================== OVERVIEW TAB ==================== -->
          <div v-if="activeTab === 'overview'">
            <div class="divide-y divide-card-border dark:divide-card-border-dark">
              <InfoRow
                label="Transaction Hash"
                tooltip="A unique identifier for this transaction"
                :value="tx.hash"
                :copyable="!!tx.hash"
                :copy-value="tx.hash"
              />
              <InfoRow label="Status" tooltip="The execution status of the transaction">
                <StatusBadge :status="txStatus" />
              </InfoRow>
              <InfoRow label="Block">
                <router-link :to="`/block-info/${tx.blockhash}`" class="etherscan-link">
                  #{{ tx.blockIndex }}
                </router-link>
              </InfoRow>
              <InfoRow label="Timestamp" :value="formatTime(tx.blocktime)" />
              <InfoRow label="Confirmations" tooltip="Number of blocks confirmed since this transaction">
                <span
                  class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ confirmations }} blocks
                </span>
              </InfoRow>

              <!-- Separator -->
              <div class="py-1"></div>

              <InfoRow label="From" tooltip="The sending address of this transaction">
                <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
                <span v-else class="text-text-secondary">-</span>
              </InfoRow>
              <InfoRow label="Network Fee" :value="`${formatGas(tx.netfee)} GAS`" />
              <InfoRow label="System Fee" :value="`${formatGas(tx.sysfee)} GAS`" />
              <InfoRow label="Total Fee">
                <span class="font-medium text-text-primary dark:text-gray-200">{{ totalFee }} GAS</span>
              </InfoRow>
              <InfoRow label="Size" :value="`${tx.size || 0} bytes`" />
            </div>

            <!-- Collapsible More Details -->
            <div class="mt-4 rounded-lg border border-card-border dark:border-card-border-dark">
              <button
                class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                @click="showMore = !showMore"
              >
                <span class="text-sm font-medium text-primary-500">Click to {{ showMore ? "hide" : "show" }} more</span>
                <svg
                  class="h-4 w-4 text-primary-500 transition-transform duration-200"
                  :class="{ 'rotate-180': showMore }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <transition name="expand">
                <div v-show="showMore" class="border-t border-card-border dark:border-card-border-dark">
                  <div class="divide-y divide-card-border dark:divide-card-border-dark">
                    <InfoRow label="Nonce" :value="tx.nonce != null ? String(tx.nonce) : '-'" />
                    <InfoRow label="Version" :value="tx.version != null ? String(tx.version) : '-'" />
                    <InfoRow label="Script">
                      <pre
                        v-if="tx.script"
                        class="max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs text-text-primary dark:bg-gray-800 dark:text-gray-300"
                        >{{ tx.script }}</pre
                      >
                      <span v-else class="text-text-secondary">-</span>
                    </InfoRow>
                    <InfoRow label="Witnesses">
                      <div v-if="tx.witnesses && tx.witnesses.length">
                        <div
                          v-for="(w, i) in tx.witnesses"
                          :key="i"
                          class="mb-2 rounded bg-gray-50 p-2 dark:bg-gray-800"
                        >
                          <p class="text-xs text-text-secondary">Witness {{ i + 1 }}</p>
                          <p class="mt-1 break-all font-mono text-xs text-text-primary dark:text-gray-300">
                            {{ w.invocation || w }}
                          </p>
                        </div>
                      </div>
                      <span v-else class="text-text-secondary">-</span>
                    </InfoRow>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- ==================== LOGS TAB ==================== -->
          <div v-else-if="activeTab === 'logs'">
            <div v-if="appLogLoading" class="py-8 text-center">
              <div class="animate-pulse space-y-3">
                <div class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
            <div v-else-if="appLogError" class="py-8 text-center">
              <p class="text-sm text-red-500">{{ appLogError }}</p>
            </div>
            <div v-else-if="!appLog" class="py-8 text-center text-text-secondary dark:text-gray-400">
              No application log available for this transaction.
            </div>
            <div v-else class="space-y-6">
              <!-- Execution Summary -->
              <div v-for="(exec, eIdx) in appLog.executions" :key="'exec-' + eIdx">
                <div class="mb-3 flex flex-wrap items-center gap-3">
                  <span
                    class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
                  >
                    Trigger: {{ exec.trigger || "Application" }}
                  </span>
                  <span
                    class="rounded px-2 py-1 text-xs font-medium"
                    :class="
                      exec.vmstate === 'HALT'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    "
                  >
                    VM State: {{ exec.vmstate || "UNKNOWN" }}
                  </span>
                  <span
                    class="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    GAS Consumed: {{ formatGas(exec.gasconsumed) }}
                  </span>
                </div>

                <!-- Stack Result -->
                <div
                  v-if="exec.stack && exec.stack.length"
                  class="mb-4 rounded-lg border border-card-border p-3 dark:border-card-border-dark"
                >
                  <h4
                    class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
                  >
                    Stack Result
                  </h4>
                  <pre class="max-h-32 overflow-auto font-mono text-xs text-text-primary dark:text-gray-200">{{
                    JSON.stringify(exec.stack, null, 2)
                  }}</pre>
                </div>

                <!-- Notifications -->
                <div v-if="exec.notifications && exec.notifications.length">
                  <h4
                    class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
                  >
                    Notifications ({{ exec.notifications.length }})
                  </h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b border-card-border dark:border-card-border-dark">
                          <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">
                            #
                          </th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">
                            Contract
                          </th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">
                            Event
                          </th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">
                            State
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                        <tr v-for="(n, nIdx) in exec.notifications" :key="'notif-' + nIdx">
                          <td class="px-3 py-2 text-xs text-text-secondary">{{ nIdx }}</td>
                          <td class="px-3 py-2">
                            <HashLink :hash="n.contract" type="contract" />
                          </td>
                          <td class="px-3 py-2">
                            <span
                              class="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            >
                              {{ n.eventname || "unknown" }}
                            </span>
                          </td>
                          <td class="px-3 py-2">
                            <pre
                              class="max-h-24 max-w-xs overflow-auto font-mono text-xs text-text-primary dark:text-gray-300"
                              >{{ formatState(n.state) }}</pre
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-else class="py-4 text-center text-sm text-text-secondary dark:text-gray-400">
                  No notifications emitted.
                </div>
              </div>
            </div>
          </div>

          <!-- ==================== TOKEN TRANSFERS TAB ==================== -->
          <div v-else-if="activeTab === 'transfers'">
            <div v-if="transfersLoading" class="py-8 text-center">
              <div class="animate-pulse space-y-3">
                <div class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
            <div v-else-if="allTransfers.length === 0" class="py-8 text-center text-text-secondary dark:text-gray-400">
              No token transfers found for this transaction.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-card-border dark:border-card-border-dark">
                    <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">#</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">Type</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">From</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">To</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-text-secondary dark:text-gray-400">
                      Amount
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">
                      Token
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-text-secondary dark:text-gray-400">
                      Contract
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr v-for="(t, tIdx) in allTransfers" :key="'xfer-' + tIdx">
                    <td class="px-3 py-2 text-xs text-text-secondary">{{ tIdx + 1 }}</td>
                    <td class="px-3 py-2">
                      <span
                        class="rounded px-2 py-0.5 text-xs font-medium"
                        :class="
                          t._standard === 'NEP-11'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        "
                      >
                        {{ t._standard }}
                      </span>
                    </td>
                    <td class="px-3 py-2">
                      <HashLink v-if="t.from" :hash="t.from" type="address" />
                      <span v-else class="text-xs text-text-secondary italic">Mint</span>
                    </td>
                    <td class="px-3 py-2">
                      <HashLink v-if="t.to" :hash="t.to" type="address" />
                      <span v-else class="text-xs text-text-secondary italic">Burn</span>
                    </td>
                    <td class="px-3 py-2 text-right font-mono text-xs text-text-primary dark:text-gray-200">
                      {{ formatTransferAmount(t) }}
                    </td>
                    <td class="px-3 py-2">
                      <span
                        class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
                      >
                        {{ t.tokenname || t.symbol || "Unknown" }}
                      </span>
                    </td>
                    <td class="px-3 py-2">
                      <HashLink :hash="t.contract || t.contractHash" type="contract" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ==================== EXECUTION TRACE TAB ==================== -->
          <div v-else-if="activeTab === 'trace'">
            <div v-if="appLogLoading" class="py-8 text-center">
              <div class="animate-pulse space-y-3">
                <div class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
            <div v-else-if="!appLog" class="py-8 text-center text-text-secondary dark:text-gray-400">
              No execution trace available for this transaction.
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="(node, nIdx) in callTree"
                :key="'tree-' + nIdx"
                class="rounded-lg border border-card-border dark:border-card-border-dark"
              >
                <div
                  class="flex flex-wrap items-center gap-3 border-b border-card-border p-4 dark:border-card-border-dark"
                >
                  <span class="rounded bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-gray-700">
                    Trigger: {{ node.trigger }}
                  </span>
                  <span
                    class="rounded px-2 py-1 text-xs font-medium"
                    :class="
                      node.vmState === 'HALT'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    "
                  >
                    {{ node.vmState }}
                  </span>
                  <span class="text-xs text-text-secondary dark:text-gray-400">
                    GAS: {{ formatGas(node.gasConsumed) }}
                  </span>
                </div>
                <div class="p-4">
                  <div v-if="node.children && node.children.length" class="space-y-3">
                    <div
                      v-for="(child, cIdx) in node.children"
                      :key="'child-' + cIdx"
                      class="rounded-md border-l-4 border-primary-500 bg-gray-50 p-3 dark:bg-gray-800/40"
                    >
                      <div class="mb-2 flex items-center gap-2">
                        <span class="text-xs font-semibold text-text-primary dark:text-gray-200">Contract:</span>
                        <HashLink :hash="child.contract" type="contract" />
                      </div>
                      <div
                        v-for="(evt, evtIdx) in child.events"
                        :key="'evt-' + evtIdx"
                        class="mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-600"
                      >
                        <span
                          class="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                        >
                          {{ evt.eventName }}
                        </span>
                        <pre
                          v-if="evt.state"
                          class="mt-1 max-h-24 overflow-auto font-mono text-xs text-text-secondary dark:text-gray-400"
                          >{{ formatState(evt.state) }}</pre
                        >
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-sm text-text-secondary dark:text-gray-400">
                    No contract interactions recorded.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { transactionService, tokenService, executionService, statsService } from "@/services";
import { formatGas } from "@/utils/explorerFormat";
import { GAS_DECIMALS } from "@/constants";
import StatusBadge from "@/components/common/StatusBadge.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";

export default {
  name: "TxDetailNew",
  components: { StatusBadge, InfoRow, HashLink },
  data() {
    return {
      tx: {},
      loading: false,
      showMore: false,
      activeTab: "overview",
      // Application log
      appLog: null,
      appLogLoading: false,
      appLogError: "",
      // Token transfers
      nep17Transfers: [],
      nep11Transfers: [],
      transfersLoading: false,
      // Network height for confirmations
      currentBlockHeight: 0,
    };
  },
  computed: {
    truncateHash() {
      const h = this.tx?.hash;
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "";
    },
    isSuccess() {
      const state = this.tx?.vmstate;
      return state === "HALT" || state === undefined || state === null;
    },
    statusBgClass() {
      return this.isSuccess ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900";
    },
    statusIconClass() {
      return this.isSuccess ? "text-green-500" : "text-red-500";
    },
    txStatus() {
      return this.isSuccess ? "success" : "failed";
    },
    tabs() {
      const notifCount = this.notificationCount;
      const xferCount = this.allTransfers.length;
      return [
        { key: "overview", label: "Overview" },
        { key: "logs", label: "Logs", count: notifCount || null },
        { key: "transfers", label: "Token Transfers", count: xferCount || null },
        { key: "trace", label: "Execution Trace" },
      ];
    },
    confirmations() {
      if (!this.currentBlockHeight || !this.tx.blockIndex) return 0;
      return Math.max(0, this.currentBlockHeight - this.tx.blockIndex);
    },
    totalFee() {
      const net = Number(this.tx.netfee || 0);
      const sys = Number(this.tx.sysfee || 0);
      return formatGas(net + sys);
    },
    allTransfers() {
      const nep17 = this.nep17Transfers.map((t) => ({ ...t, _standard: "NEP-17" }));
      const nep11 = this.nep11Transfers.map((t) => ({ ...t, _standard: "NEP-11" }));
      return [...nep17, ...nep11];
    },
    notificationCount() {
      if (!this.appLog?.executions) return 0;
      return this.appLog.executions.reduce((sum, exec) => sum + (exec.notifications?.length || 0), 0);
    },
    isComplexTx() {
      return executionService.isComplexTransaction(this.appLog);
    },
    callTree() {
      return executionService.buildCallTree(this.appLog);
    },
    actionSummary() {
      return this.buildActionSummary();
    },
  },
  watch: {
    "$route.params.txhash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadTx(hash);
      },
    },
  },
  methods: {
    async loadTx(hash) {
      this.loading = true;
      this.resetState();
      try {
        this.tx = (await transactionService.getByHash(hash)) || {};
        // Fire secondary data loads in parallel after main tx loads
        this.loadAppLog(hash);
        this.loadTransfers(hash);
        this.loadBlockHeight();
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },
    resetState() {
      this.appLog = null;
      this.appLogError = "";
      this.nep17Transfers = [];
      this.nep11Transfers = [];
      this.currentBlockHeight = 0;
      this.showMore = false;
      this.activeTab = "overview";
    },
    async loadAppLog(hash) {
      this.appLogLoading = true;
      this.appLogError = "";
      try {
        this.appLog = await transactionService.getApplicationLog(hash);
      } catch (e) {
        this.appLogError = "Failed to load application log.";
      } finally {
        this.appLogLoading = false;
      }
    },
    async loadTransfers(hash) {
      this.transfersLoading = true;
      try {
        const [nep17Res, nep11Res] = await Promise.all([
          tokenService.getTransfersByTxHash(hash).catch(() => ({ result: [] })),
          tokenService.getNep11TransfersByTxHash(hash).catch(() => ({ result: [] })),
        ]);
        this.nep17Transfers = nep17Res?.result || [];
        this.nep11Transfers = nep11Res?.result || [];
      } catch {
        // Graceful degradation
      } finally {
        this.transfersLoading = false;
      }
    },
    async loadBlockHeight() {
      try {
        const stats = await statsService.getDashboardStats();
        this.currentBlockHeight = stats?.blocks || 0;
      } catch {
        // Non-critical, confirmations will show 0
      }
    },
    buildActionSummary() {
      if (!this.tx.hash) return "";
      const transfers = this.nep17Transfers;
      if (transfers.length === 1) {
        const t = transfers[0];
        const amount = this.formatTransferAmount(t);
        const token = t.tokenname || t.symbol || "Token";
        const from = t.from ? this.shortAddr(t.from) : "Mint";
        const to = t.to ? this.shortAddr(t.to) : "Burn";
        return `Transfer ${amount} ${token} from ${from} to ${to}`;
      }
      if (transfers.length > 1) {
        return `${transfers.length} token transfers in this transaction`;
      }
      if (this.notificationCount > 0) {
        return "Contract Call with " + this.notificationCount + " notification(s)";
      }
      return "";
    },
    shortAddr(addr) {
      if (!addr) return "";
      return addr.length > 12 ? addr.slice(0, 6) + "..." + addr.slice(-4) : addr;
    },
    formatTransferAmount(t) {
      const raw = Number(t.value || t.amount || 0);
      const decimals = Number(t.decimals ?? GAS_DECIMALS);
      if (decimals === 0) return String(raw);
      return (raw / Math.pow(10, decimals)).toFixed(Math.min(decimals, 8));
    },
    formatState(state) {
      if (!state) return "-";
      try {
        return JSON.stringify(state, null, 2);
      } catch {
        return String(state);
      }
    },
    formatTime(ts) {
      if (!ts) return "-";
      const ms = ts > 1e12 ? ts : ts * 1000;
      return new Date(ms).toLocaleString();
    },
    formatGas,
  },
};
</script>
