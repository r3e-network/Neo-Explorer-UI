<template>
  <div class="tx-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbs" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="page-header-icon"
          :class="
            isSuccess === true
              ? 'bg-green-100 dark:bg-green-900/40'
              : isSuccess === false
              ? 'bg-red-100 dark:bg-red-900/40'
              : 'bg-gray-100 dark:bg-gray-700'
          "
        >
          <svg
            class="h-6 w-6"
            :class="
              isSuccess === true
                ? 'text-green-500'
                : isSuccess === false
                ? 'text-red-500'
                : 'text-gray-400 dark:text-gray-500'
            "
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="isSuccess === true"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              v-else-if="isSuccess === false"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Transaction Details</h1>
          <StatusBadge :status="txStatus" />
        </div>
      </div>

      <!-- Action Summary Banner -->
      <div
        v-if="!loading && tx.hash && actionSummary"
        class="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
      >
        <svg
          class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-sm text-blue-800 dark:text-blue-300">
          {{ actionSummary }}
        </p>
      </div>

      <!-- Complex Transaction Banner -->
      <div
        v-if="!loading && isComplexTx"
        class="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
      >
        <div class="flex items-center gap-2">
          <svg
            class="h-5 w-5 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
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

      <!-- State Change Summary (complex transactions only) -->
      <StateChangeSummary
        v-if="isComplexTx"
        :enriched-trace="enrichedTrace"
        :loading="enrichedLoading"
        class="mb-6"
      />

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 8" :key="'skel-' + i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState
        v-else-if="error"
        title="Transaction not found"
        :message="error"
        @retry="loadTx(txHash)"
      />

      <!-- Tabbed Content -->
      <div v-else-if="tx.hash" class="etherscan-card">
        <!-- Tab Navigation -->
        <div class="border-b border-card-border dark:border-card-border-dark">
          <nav class="flex flex-wrap" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              role="tab"
              :aria-selected="activeTab === tab.key"
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
            <div
              class="divide-y divide-card-border dark:divide-card-border-dark"
            >
              <InfoRow
                label="Transaction Hash"
                tooltip="A unique identifier for this transaction"
                :value="tx.hash"
                :copyable="!!tx.hash"
                :copy-value="tx.hash"
              />

              <InfoRow
                label="Status"
                tooltip="The execution status of the transaction"
              >
                <StatusBadge :status="txStatus" />
              </InfoRow>

              <InfoRow label="Block">
                <router-link
                  :to="`/block-info/${tx.blockhash}`"
                  class="etherscan-link"
                >
                  #{{ tx.blockIndex }}
                </router-link>
              </InfoRow>

              <InfoRow label="Timestamp">
                <span class="text-text-primary dark:text-gray-200">{{
                  formatTime(tx.blocktime)
                }}</span>
                <span
                  class="ml-2 text-xs text-text-secondary dark:text-gray-400"
                >
                  ({{ formatAge(tx.blocktime) }})
                </span>
              </InfoRow>

              <InfoRow
                label="Confirmations"
                tooltip="Number of blocks confirmed since this transaction"
              >
                <span
                  class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ confirmations.toLocaleString() }} blocks
                </span>
              </InfoRow>

              <!-- Separator -->
              <div class="py-1" />

              <InfoRow
                label="From"
                tooltip="The sending address of this transaction"
              >
                <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
                <span v-else class="text-text-secondary">-</span>
              </InfoRow>

              <InfoRow
                label="Network Fee"
                :value="`${formatGas(tx.netfee)} GAS`"
              />
              <InfoRow
                label="System Fee"
                :value="`${formatGas(tx.sysfee)} GAS`"
              />

              <InfoRow label="Total Fee">
                <span class="font-medium text-text-primary dark:text-gray-200"
                  >{{ totalFee }} GAS</span
                >
              </InfoRow>

              <InfoRow label="Size" :value="`${tx.size || 0} bytes`" />
            </div>

            <!-- Gas Breakdown (complex transactions) -->
            <div
              v-if="isComplexTx && enrichedTrace"
              class="mt-4 rounded-lg border border-card-border dark:border-card-border-dark p-4"
            >
              <GasBreakdown
                :executions="enrichedTrace?.executions ?? []"
                :total-gas="totalGas"
                :loading="enrichedLoading"
              />
            </div>

            <!-- Collapsible More Details -->
            <div
              class="mt-4 rounded-lg border border-card-border dark:border-card-border-dark"
            >
              <button
                class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                @click="showMore = !showMore"
              >
                <span class="text-sm font-medium text-primary-500">
                  Click to {{ showMore ? "hide" : "show" }} more
                </span>
                <svg
                  class="h-4 w-4 text-primary-500 transition-transform duration-200"
                  :class="{ 'rotate-180': showMore }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <transition name="expand">
                <div
                  v-show="showMore"
                  class="border-t border-card-border dark:border-card-border-dark"
                >
                  <div
                    class="divide-y divide-card-border dark:divide-card-border-dark"
                  >
                    <InfoRow
                      label="Nonce"
                      :value="tx.nonce != null ? String(tx.nonce) : '-'"
                    />
                    <InfoRow
                      label="Version"
                      :value="tx.version != null ? String(tx.version) : '-'"
                    />
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
                          <p class="text-xs text-text-secondary">
                            Witness {{ i + 1 }}
                          </p>
                          <p
                            class="mt-1 break-all font-mono text-xs text-text-primary dark:text-gray-300"
                          >
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

          <!-- ==================== SCRIPT & WITNESSES TAB ==================== -->
          <div v-else-if="activeTab === 'script'">
            <div class="space-y-6">
              <!-- Invocation Script (tx.script) -->
              <ScriptViewer
                v-if="tx.script"
                :script="tx.script"
                label="Invocation Script"
              />
              <div
                v-else
                class="text-sm text-text-secondary dark:text-gray-400"
              >
                No invocation script available.
              </div>

              <!-- Witnesses -->
              <template v-if="tx.witnesses && tx.witnesses.length">
                <div
                  v-for="(w, i) in tx.witnesses"
                  :key="'witness-' + i"
                  class="space-y-4"
                >
                  <div
                    class="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <span
                      class="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-text-primary dark:bg-gray-700 dark:text-gray-200"
                    >
                      Witness {{ i + 1 }}
                    </span>
                  </div>
                  <ScriptViewer
                    v-if="w.invocation"
                    :script="w.invocation"
                    :label="`Witness ${i + 1} — Invocation Script`"
                  />
                  <ScriptViewer
                    v-if="w.verification"
                    :script="w.verification"
                    :label="`Witness ${i + 1} — Verification Script`"
                  />
                </div>
              </template>
              <div
                v-else
                class="text-sm text-text-secondary dark:text-gray-400 mt-4"
              >
                No witnesses available.
              </div>
            </div>
          </div>

          <!-- ==================== LOGS TAB ==================== -->
          <div v-else-if="activeTab === 'logs'">
            <!-- Loading -->
            <div v-if="appLogLoading" class="py-8 text-center">
              <div class="animate-pulse space-y-3">
                <div
                  class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"
                />
                <div
                  class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"
                />
              </div>
            </div>
            <!-- Error -->
            <div v-else-if="appLogError" class="py-8 text-center">
              <p class="text-sm text-red-500">{{ appLogError }}</p>
            </div>
            <!-- Empty -->
            <div
              v-else-if="!appLog"
              class="py-8 text-center text-text-secondary dark:text-gray-400"
            >
              No application log available for this transaction.
            </div>
            <!-- Content -->
            <div v-else class="space-y-6">
              <!-- Raw JSON toggle -->
              <div class="flex justify-end">
                <button
                  class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="
                    showRawAppLog
                      ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                  "
                  @click="showRawAppLog = !showRawAppLog"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  {{ showRawAppLog ? "Decoded View" : "Raw JSON" }}
                </button>
              </div>

              <!-- Full raw JSON view -->
              <pre
                v-if="showRawAppLog"
                class="max-h-[600px] overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-4 font-mono text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                >{{ formatState(appLog) }}</pre
              >

              <template v-if="!showRawAppLog">
                <div
                  v-for="(exec, eIdx) in appLog.executions"
                  :key="'exec-' + eIdx"
                >
                  <!-- Execution badges -->
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
                      GAS Consumed: {{ formatGasDecimal(exec.gasconsumed) }}
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
                    <pre
                      class="max-h-32 overflow-auto font-mono text-xs text-text-primary dark:text-gray-200"
                      >{{ JSON.stringify(exec.stack, null, 2) }}</pre
                    >
                  </div>

                  <!-- Notifications -->
                  <div v-if="exec.notifications && exec.notifications.length">
                    <h4
                      class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
                    >
                      Notifications ({{ exec.notifications.length }})
                    </h4>
                    <!-- Enriched display when available -->
                    <div
                      v-if="enrichedTrace && enrichedTrace.executions[eIdx]"
                      class="space-y-3"
                    >
                      <EnrichedNotification
                        v-for="(op, opIdx) in enrichedTrace.executions[eIdx]
                          .operations"
                        :key="'enriched-' + opIdx"
                        :notification="op"
                        :event-def="op.eventDef"
                      />
                    </div>
                    <!-- Raw fallback -->
                    <div v-else class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead>
                          <tr
                            class="border-b border-card-border dark:border-card-border-dark"
                          >
                            <th class="table-header-cell">#</th>
                            <th class="table-header-cell">Contract</th>
                            <th class="table-header-cell">Event</th>
                            <th class="table-header-cell">State</th>
                          </tr>
                        </thead>
                        <tbody
                          class="divide-y divide-card-border dark:divide-card-border-dark"
                        >
                          <tr
                            v-for="(n, nIdx) in exec.notifications"
                            :key="'notif-' + nIdx"
                          >
                            <td class="table-cell-secondary text-xs">
                              {{ nIdx }}
                            </td>
                            <td class="table-cell">
                              <HashLink :hash="n.contract" type="contract" />
                            </td>
                            <td class="table-cell">
                              <span
                                class="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                              >
                                {{ n.eventname || "unknown" }}
                              </span>
                            </td>
                            <td class="table-cell">
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
                  <div
                    v-else
                    class="py-4 text-center text-sm text-text-secondary dark:text-gray-400"
                  >
                    No notifications emitted.
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- ==================== TOKEN TRANSFERS TAB ==================== -->
          <div v-else-if="activeTab === 'transfers'">
            <!-- Loading -->
            <div v-if="transfersLoading" class="py-8 text-center">
              <div class="animate-pulse space-y-3">
                <div
                  class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"
                />
                <div
                  class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"
                />
              </div>
            </div>
            <!-- Empty -->
            <div
              v-else-if="allTransfers.length === 0"
              class="py-8 text-center text-text-secondary dark:text-gray-400"
            >
              No token transfers found for this transaction.
            </div>
            <!-- Content -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr
                    class="border-b border-card-border dark:border-card-border-dark"
                  >
                    <th class="table-header-cell">#</th>
                    <th class="table-header-cell">Type</th>
                    <th class="table-header-cell">From</th>
                    <th class="table-header-cell">To</th>
                    <th class="table-header-cell-right">Amount</th>
                    <th class="table-header-cell">Token</th>
                    <th class="table-header-cell">Contract</th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-card-border dark:divide-card-border-dark"
                >
                  <tr v-for="(t, tIdx) in allTransfers" :key="'xfer-' + tIdx">
                    <td class="table-cell-secondary text-xs">{{ tIdx + 1 }}</td>
                    <td class="table-cell">
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
                    <td class="table-cell">
                      <HashLink v-if="t.from" :hash="t.from" type="address" />
                      <span v-else class="text-xs italic text-text-secondary"
                        >Mint</span
                      >
                    </td>
                    <td class="table-cell">
                      <HashLink v-if="t.to" :hash="t.to" type="address" />
                      <span v-else class="text-xs italic text-text-secondary"
                        >Burn</span
                      >
                    </td>
                    <td class="table-cell text-right font-mono text-xs">
                      {{ formatTransferAmount(t) }}
                    </td>
                    <td class="table-cell">
                      <span
                        class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
                      >
                        {{ t.tokenname || t.symbol || "Unknown" }}
                      </span>
                    </td>
                    <td class="table-cell">
                      <HashLink
                        :hash="t.contract || t.contractHash"
                        type="contract"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ==================== INTERNAL OPS TAB ==================== -->
          <div v-else-if="activeTab === 'internal'">
            <InternalOperations
              :enriched-trace="enrichedTrace"
              :loading="enrichedLoading"
            />
          </div>

          <!-- ==================== EXECUTION TRACE TAB ==================== -->
          <div v-else-if="activeTab === 'trace'">
            <!-- Loading -->
            <div v-if="appLogLoading" class="py-8 text-center">
              <div class="animate-pulse space-y-3">
                <div
                  class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"
                />
                <div
                  class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"
                />
              </div>
            </div>
            <!-- Empty -->
            <div
              v-else-if="!appLog"
              class="py-8 text-center text-text-secondary dark:text-gray-400"
            >
              No execution trace available for this transaction.
            </div>
            <!-- Content -->
            <div v-else class="space-y-4">
              <!-- Full trace link for complex txns -->
              <router-link
                v-if="isComplexTx"
                :to="`/tx/${txHash}/trace`"
                class="mb-4 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View Full Execution Trace
              </router-link>

              <div
                v-for="(node, nIdx) in callTree"
                :key="'tree-' + nIdx"
                class="rounded-lg border border-card-border dark:border-card-border-dark"
              >
                <div
                  class="flex flex-wrap items-center gap-3 border-b border-card-border p-4 dark:border-card-border-dark"
                >
                  <span
                    class="rounded bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-gray-700"
                  >
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
                    GAS: {{ formatGasDecimal(node.gasConsumed) }}
                  </span>
                </div>
                <div class="p-4">
                  <div
                    v-if="node.children && node.children.length"
                    class="space-y-3"
                  >
                    <div
                      v-for="(child, cIdx) in node.children"
                      :key="'child-' + cIdx"
                      class="rounded-md border-l-4 border-primary-500 bg-gray-50 p-3 dark:bg-gray-800/40"
                    >
                      <div class="mb-2 flex items-center gap-2">
                        <span
                          class="text-xs font-semibold text-text-primary dark:text-gray-200"
                          >Contract:</span
                        >
                        <HashLink :hash="child.contract" type="contract" />
                      </div>
                      <div
                        v-for="(evt, evtIdx) in child.events"
                        :key="'evt-' + evtIdx"
                        class="mt-2 border-l-2 border-gray-200 pl-3 dark:border-gray-600"
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
                  <div
                    v-else
                    class="text-sm text-text-secondary dark:text-gray-400"
                  >
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

<script setup>
// eslint-disable-next-line no-unused-vars
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import {
  transactionService,
  tokenService,
  executionService,
  blockService,
} from "@/services";
import { GAS_DECIMALS } from "@/constants";
import {
  formatGas,
  formatGasDecimal,
  formatAge,
  truncateHash,
  formatTime,
} from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import InternalOperations from "@/components/trace/InternalOperations.vue";
import EnrichedNotification from "@/components/trace/EnrichedNotification.vue";
import StateChangeSummary from "@/components/trace/StateChangeSummary.vue";
import GasBreakdown from "@/components/trace/GasBreakdown.vue";
import ScriptViewer from "@/components/trace/ScriptViewer.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";

const route = useRoute();

// --- Reactive State ---
const abortController = ref(null);
const tx = ref({});
const loading = ref(false);
const error = ref(null);
const showMore = ref(false);
const activeTab = ref("overview");

// Application log
const appLog = ref(null);
const appLogLoading = ref(false);
const appLogError = ref("");
const showRawAppLog = ref(false);

// Token transfers
const nep17Transfers = ref([]);
const nep11Transfers = ref([]);
const transfersLoading = ref(false);

// Network height for confirmations
const currentBlockHeight = ref(0);

// Enriched trace
const enrichedTrace = ref(null);
const enrichedLoading = ref(false);

// --- Computed ---
const txHash = computed(() => route.params.txhash || "");

const breadcrumbs = computed(() => [
  { label: "Home", to: "/homepage" },
  { label: "Transactions", to: "/transactions/1" },
  { label: truncateHash(txHash.value, 10, 6) },
]);

const isSuccess = computed(() => {
  const state = tx.value?.vmstate;
  if (!state) return null; // unknown yet
  return state === "HALT";
});

const txStatus = computed(() => {
  if (isSuccess.value === null) return "pending";
  return isSuccess.value ? "success" : "failed";
});

const confirmations = computed(() => {
  if (!currentBlockHeight.value || !tx.value.blockIndex) return 0;
  return Math.max(0, currentBlockHeight.value - tx.value.blockIndex);
});

const totalFee = computed(() => {
  const net = Number(tx.value.netfee || 0);
  const sys = Number(tx.value.sysfee || 0);
  return formatGas(net + sys);
});

const allTransfers = computed(() => {
  return [...nep17Transfers.value, ...nep11Transfers.value];
});

const notificationCount = computed(() => {
  if (!appLog.value?.executions) return 0;
  return appLog.value.executions.reduce(
    (sum, exec) => sum + (exec.notifications?.length || 0),
    0
  );
});

const isComplexTx = computed(() =>
  executionService.isComplexTransaction(appLog.value)
);
const callTree = computed(() => executionService.buildCallTree(appLog.value));

const enrichedOpsCount = computed(() => {
  if (!enrichedTrace.value?.executions) return 0;
  return enrichedTrace.value.executions.reduce(
    (sum, e) => sum + (e.operations?.length ?? 0),
    0
  );
});

const totalGas = computed(() => {
  if (!enrichedTrace.value?.executions) return "0";
  return enrichedTrace.value.executions
    .reduce((sum, e) => sum + Number(e.gasConsumed || 0), 0)
    .toString();
});

const tabs = computed(() => [
  { key: "overview", label: "Overview" },
  { key: "script", label: "Script & Witnesses" },
  { key: "logs", label: "Logs", count: notificationCount.value || null },
  {
    key: "transfers",
    label: "Token Transfers",
    count: allTransfers.value.length || null,
  },
  {
    key: "internal",
    label: "Internal Ops",
    count: enrichedOpsCount.value || null,
  },
  { key: "trace", label: "Execution Trace" },
]);

const actionSummary = computed(() => buildActionSummary());

// --- Methods ---
function formatState(state) {
  if (!state) return "-";
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}

function formatTransferAmount(t) {
  const raw = Number(t.value || t.amount || 0);
  const decimals = Number(t.decimals ?? GAS_DECIMALS);
  if (decimals === 0) return String(raw);
  return (raw / Math.pow(10, decimals)).toFixed(Math.min(decimals, 8));
}

function buildActionSummary() {
  if (!tx.value.hash) return "";
  const transfers = allTransfers.value;
  if (transfers.length === 1) {
    const t = transfers[0];
    const amount = formatTransferAmount(t);
    const token = t.tokenname || t.symbol || "Token";
    const from = t.from ? truncateHash(t.from, 6, 4) : "Mint";
    const to = t.to ? truncateHash(t.to, 6, 4) : "Burn";
    return `Transfer ${amount} ${token} from ${from} to ${to}`;
  }
  if (transfers.length > 1) {
    return `${transfers.length} token transfers in this transaction`;
  }
  if (notificationCount.value > 0) {
    return "Contract Call with " + notificationCount.value + " notification(s)";
  }
  return "";
}

// --- Data Loading ---
function resetState() {
  appLog.value = null;
  appLogError.value = "";
  nep17Transfers.value = [];
  nep11Transfers.value = [];
  currentBlockHeight.value = 0;
  enrichedTrace.value = null;
  showMore.value = false;
  activeTab.value = "overview";
  error.value = null;
}

async function loadTx(hash) {
  if (!hash) return;
  abortController.value?.abort();
  abortController.value = new AbortController();
  loading.value = true;
  resetState();
  try {
    tx.value = (await transactionService.getByHash(hash)) || {};
    if (abortController.value?.signal.aborted) return;
    // Fire secondary loads in parallel
    loadTransfers(hash);
    loadBlockHeight();
    loadEnrichedTrace(hash);
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production")
      console.error("Failed to load transaction:", err);
    error.value = "Failed to load transaction details.";
  } finally {
    loading.value = false;
  }
}

async function loadEnrichedTrace(hash) {
  enrichedLoading.value = true;
  appLogLoading.value = true;
  appLogError.value = "";
  try {
    enrichedTrace.value = await executionService.getEnrichedTrace(hash);
    if (abortController.value?.signal.aborted) return;
    appLog.value = enrichedTrace.value?.raw ?? null;
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production")
      console.warn("Failed to load enriched trace:", err);
    try {
      appLog.value = await executionService.getExecutionTrace(hash);
    } catch {
      appLogError.value = "Failed to load application log.";
    }
  } finally {
    enrichedLoading.value = false;
    appLogLoading.value = false;
  }
}

async function loadTransfers(hash) {
  transfersLoading.value = true;
  try {
    const [nep17Res, nep11Res] = await Promise.all([
      tokenService.getTransfersByTxHash(hash).catch(() => ({ result: [] })),
      tokenService
        .getNep11TransfersByTxHash(hash)
        .catch(() => ({ result: [] })),
    ]);
    if (abortController.value?.signal.aborted) return;
    nep17Transfers.value = (nep17Res?.result || []).map((t) => ({
      ...t,
      _standard: "NEP-17",
    }));
    nep11Transfers.value = (nep11Res?.result || []).map((t) => ({
      ...t,
      _standard: "NEP-11",
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production")
      console.warn("Failed to load token transfers:", err);
  } finally {
    transfersLoading.value = false;
  }
}

async function loadBlockHeight() {
  try {
    const count = await blockService.getCount();
    currentBlockHeight.value = count || 0;
  } catch (err) {
    if (process.env.NODE_ENV !== "production")
      console.warn("Failed to load block height:", err);
  }
}

onBeforeUnmount(() => {
  abortController.value?.abort();
});

watch(
  () => route.params.txhash,
  (hash) => {
    if (hash) loadTx(hash);
  },
  { immediate: true }
);
</script>
