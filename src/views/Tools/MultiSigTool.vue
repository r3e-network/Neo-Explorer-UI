<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[
          { label: $t('nav.home'), to: '/homepage' },
          { label: $t('tools.title'), to: '/tools' },
          { label: $t('tools.multisig.breadcrumb') },
        ]"
      />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              ></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t("tools.multisig.title") }}</h1>
            <p class="page-subtitle">{{ $t("tools.multisig.subtitle") }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sidebar -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Docs Card -->
          <div
            class="etherscan-card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200/60 dark:border-blue-900/40"
          >
            <div class="flex items-center gap-3 mb-4 border-b border-blue-200/60 dark:border-blue-800/60 pb-3">
              <div class="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-lg shrink-0">
                <svg
                  class="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <h4 class="font-bold text-high">{{ $t("tools.multisig.howItWorksTitle") }}</h4>
            </div>
            <ol class="space-y-3 text-sm text-mid list-decimal list-inside ml-1">
              <li>
                <strong>{{ $t("tools.multisig.stepCreate") }}</strong> {{ $t("tools.multisig.stepCreateDesc") }}
              </li>
              <li>
                <strong>{{ $t("tools.multisig.stepDraft") }}</strong> {{ $t("tools.multisig.stepDraftDesc") }}
              </li>
              <li>
                <strong>{{ $t("tools.multisig.stepCollect") }}</strong> {{ $t("tools.multisig.stepCollectDesc") }}
              </li>
              <li>
                <strong>{{ $t("tools.multisig.stepExecute") }}</strong> {{ $t("tools.multisig.stepExecuteDesc") }}
              </li>
            </ol>
          </div>

          <!-- Saved Configs -->
          <div class="etherscan-card p-5">
            <h4 class="font-bold text-high mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                ></path>
              </svg>
              {{ $t("tools.multisig.savedSignerGroups") }}
            </h4>
            <div
              v-if="savedConfigs.length === 0"
              class="text-sm text-mid py-4 text-center border border-dashed border-line-soft rounded-lg bg-surface-muted"
            >
              {{ $t("tools.multisig.noSavedGroups") }}
            </div>
            <div v-else class="space-y-3 max-h-64 overflow-y-auto pr-1">
              <div
                v-for="(cfg, idx) in savedConfigs"
                :key="idx"
                class="p-3 border border-line-soft rounded-xl hover:border-blue-400 transition-colors cursor-pointer group bg-surface"
                @click="loadConfig(cfg)"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold text-sm text-high group-hover:text-blue-600">{{ cfg.name }}</span>
                  <button
                    @click.stop="deleteConfig(idx)"
                    class="text-low hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
                <div class="text-xs text-mid flex gap-2">
                  <span class="bg-surface-muted px-1.5 py-0.5 rounded"
                    >{{ cfg.threshold }} of {{ cfg.pubkeys.length }}</span
                  >
                  <span class="truncate">{{ cfg.pubkeys[0].slice(0, 10) }}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="lg:col-span-8">
          <div class="etherscan-card min-h-[500px] flex flex-col shadow-sm">
            <!-- Tabs -->
            <div class="flex items-center gap-6 px-6 pt-4 border-b border-line-soft mb-6">
              <button
                class="pb-3 text-sm font-bold border-b-2 transition-colors"
                :class="
                  activeTab === 'requests'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                    : 'border-transparent text-mid hover:text-high'
                "
                @click="activeTab = 'requests'"
              >
                {{ $t("tools.multisig.tabActiveRequests") }}
              </button>
              <button
                class="pb-3 text-sm font-bold border-b-2 transition-colors"
                :class="
                  activeTab === 'create'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                    : 'border-transparent text-mid hover:text-high'
                "
                @click="activeTab = 'create'"
              >
                {{ $t("tools.multisig.tabNewRequest") }}
              </button>
            </div>

            <div class="p-6 pt-0 flex-1">
              <!-- Create Tab -->
              <div v-if="activeTab === 'create'" class="space-y-6 max-w-2xl">
                <!-- Group Settings -->
                <div class="space-y-4">
                  <h3 class="text-base font-bold text-high border-b border-line-soft pb-2">
                    {{ $t("tools.multisig.signerGroup") }}
                  </h3>

                  <div>
                    <label class="block text-sm font-medium text-high mb-1">{{
                      $t("tools.multisig.signerPubkeys")
                    }}</label>
                    <textarea
                      v-model="createForm.pubkeys"
                      class="form-input w-full font-mono text-xs h-20 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                      :placeholder="$t('tools.multisig.pubkeysPlaceholder')"
                    ></textarea>
                  </div>

                  <div class="flex items-center gap-4">
                    <div class="flex-1">
                      <label class="block text-sm font-medium text-high mb-1">{{
                        $t("tools.multisig.requiredSignatures")
                      }}</label>
                      <input
                        v-model="createForm.threshold"
                        type="number"
                        class="form-input w-full rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                        value="2"
                        min="1"
                      />
                    </div>
                    <div class="flex-1 flex items-end h-full pt-6">
                      <button
                        @click="saveCurrentConfig"
                        class="w-full px-4 py-2 border border-line-soft text-sm font-medium rounded-lg hover:bg-surface-muted transition-colors flex items-center justify-center gap-2 text-mid hover:text-high"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          ></path>
                        </svg>
                        {{ $t("tools.multisig.saveGroup") }}
                      </button>
                    </div>
                  </div>

                  <!-- Derived Address Preview -->
                  <transition name="fade">
                    <div
                      v-if="derivedMultisigAddress"
                      class="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30 flex items-center justify-between gap-4 mt-2"
                    >
                      <div>
                        <p class="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
                          {{ $t("tools.multisig.derivedAddress") }}
                        </p>
                        <p class="text-sm text-blue-900 dark:text-blue-300 font-mono font-bold">
                          {{ derivedMultisigAddress }}
                        </p>
                      </div>
                      <CopyButton :text="derivedMultisigAddress" />
                    </div>
                  </transition>
                </div>

                <!-- Transaction Details -->
                <div class="space-y-4 pt-4">
                  <h3 class="text-base font-bold text-high border-b border-line-soft pb-2">
                    {{ $t("tools.multisig.txDetails") }}
                  </h3>

                  <div>
                    <label class="block text-sm font-medium text-high mb-1">{{
                      $t("tools.multisig.requestDescription")
                    }}</label>
                    <input
                      v-model="createForm.description"
                      type="text"
                      class="form-input w-full rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                      :placeholder="$t('tools.multisig.descriptionPlaceholder')"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-high mb-1">{{
                      $t("tools.multisig.targetContractHash")
                    }}</label>
                    <input
                      v-model="createForm.targetContract"
                      type="text"
                      class="form-input w-full font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                      :placeholder="$t('tools.multisig.contractHashPlaceholder')"
                      list="fast-contracts"
                    />
                    <datalist id="fast-contracts">
                      <option :value="FLM_HASH">Flamingo (FLM)</option>
                      <option :value="BNEO_HASH">NeoBurger (bNEO)</option>
                      <option :value="NEO_HASH">NEO Token</option>
                      <option :value="GAS_HASH">GAS Token</option>
                    </datalist>
                  </div>

                  <div class="flex gap-4">
                    <div class="flex-1">
                      <label class="block text-sm font-medium text-high mb-1">{{ $t("tools.multisig.method") }}</label>
                      <input
                        v-model="createForm.method"
                        type="text"
                        class="form-input w-full font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                        :placeholder="$t('tools.multisig.methodPlaceholder')"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-high mb-1">{{
                      $t("tools.multisig.argsJsonArray")
                    }}</label>
                    <textarea
                      v-model="createForm.argsStr"
                      class="form-input w-full font-mono text-xs h-24 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                      :placeholder="$t('tools.multisig.argsPlaceholder')"
                    ></textarea>
                  </div>
                </div>

                <div class="pt-4 border-t border-line-soft flex justify-end">
                  <button
                    @click="handleCreateRequest"
                    :disabled="!connectedAccount || isCreating || !derivedMultisigAddress"
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
                  >
                    <svg v-if="isCreating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    {{ isCreating ? $t("tools.multisig.creatingRequest") : $t("tools.multisig.publishRequest") }}
                  </button>
                </div>
              </div>

              <!-- Requests Tab -->
              <div v-else-if="activeTab === 'requests'">
                <div v-if="loading" class="space-y-4">
                  <Skeleton v-for="i in 3" :key="i" height="120px" />
                </div>
                <div
                  v-else-if="requests.length === 0"
                  class="text-center py-16 border border-dashed border-line-soft rounded-3xl bg-surface-muted/30"
                >
                  <div
                    class="h-16 w-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-5 border border-line-soft shadow-sm"
                  >
                    <svg class="h-8 w-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  </div>
                  <p class="text-high text-lg font-bold mb-2">{{ $t("tools.multisig.noActiveRequests") }}</p>
                  <p class="text-sm text-mid max-w-sm mx-auto mb-4">
                    {{ $t("tools.multisig.noActiveRequestsDesc") }}
                  </p>
                  <button
                    v-if="connectedAccount"
                    @click="activeTab = 'create'"
                    class="text-blue-600 font-semibold hover:underline"
                  >
                    {{ $t("tools.multisig.createNewRequest") }}
                  </button>
                  <span v-else class="text-sm font-medium text-mid">{{
                    $t("tools.multisig.connectWalletToCreate")
                  }}</span>
                </div>

                <div v-else class="space-y-4">
                  <div
                    v-for="req in requests"
                    :key="req.id"
                    class="border border-line-soft bg-surface rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
                  >
                    <div class="flex flex-col sm:flex-row gap-4 items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1.5">
                          <span class="font-bold text-high text-base">{{ req.method }}</span>
                          <span
                            class="text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-bold"
                            :class="
                              req.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            "
                          >
                            {{ req.status }}
                          </span>
                        </div>
                        <p class="text-sm text-mid mb-3 line-clamp-2">
                          {{ req.description || $t("tools.multisig.noDescription") }}
                        </p>

                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-low font-mono">
                          <div class="flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              ></path></svg
                            >{{ req.target_contract }}
                          </div>
                          <div class="flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path></svg
                            >{{ new Date(req.created_at).toLocaleDateString() }}
                          </div>
                          <button
                            @click="viewDetails(req)"
                            class="text-blue-500 hover:text-blue-600 font-sans font-medium flex items-center gap-1"
                          >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                              ></path>
                            </svg>
                            {{ $t("tools.multisig.viewPayload") }}
                          </button>
                        </div>
                      </div>

                      <div class="flex flex-col items-end gap-3 shrink-0 sm:w-40">
                        <div class="w-full bg-surface-muted rounded-xl p-3 border border-line-soft text-center">
                          <p class="text-[10px] uppercase font-bold text-mid tracking-wider mb-1">
                            {{ $t("tools.multisig.signatures") }}
                          </p>
                          <div class="flex items-baseline justify-center gap-1">
                            <span
                              class="text-2xl font-black"
                              :class="
                                (req.signatures?.length || 0) >= req.signers_required
                                  ? 'text-emerald-500'
                                  : 'text-blue-600 dark:text-blue-400'
                              "
                              >{{ req.signatures?.length || 0 }}</span
                            >
                            <span class="text-sm font-bold text-mid">/ {{ req.signers_required }}</span>
                          </div>
                        </div>

                        <div class="w-full flex flex-col gap-2">
                          <template v-if="req.status === 'PENDING'">
                            <button
                              v-if="(req.signatures?.length || 0) >= req.signers_required"
                              @click="handleBroadcast(req)"
                              class="w-full py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              {{ $t("tools.multisig.broadcastTx") }}
                            </button>
                            <button
                              v-else-if="
                                connectedAccount && req.eligible_signers?.includes(connectedAccount) && !hasSigned(req)
                              "
                              @click="openSignModal(req)"
                              class="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              {{ $t("tools.multisig.signPayload") }}
                            </button>
                            <div
                              v-else-if="hasSigned(req)"
                              class="w-full py-2 bg-surface-muted text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M5 13l4 4L19 7"
                                ></path>
                              </svg>
                              {{ $t("tools.multisig.youSigned") }}
                            </div>
                            <div v-else class="w-full text-center text-xs text-mid py-2">
                              {{ $t("tools.multisig.waitingForSigners") }}
                            </div>
                          </template>
                          <template v-if="req.status === 'EXECUTED'">
                            <a
                              :href="'/transaction-info/' + req.tx_hash"
                              class="w-full py-2 bg-surface-muted text-high border border-line-soft text-sm font-bold rounded-lg flex items-center justify-center hover:bg-line-soft transition-colors"
                            >
                              {{ $t("tools.multisig.viewTx") }}
                            </a>
                          </template>
                        </div>
                      </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mt-4">
                      <div class="w-full bg-line-soft rounded-full h-1.5 mb-2 overflow-hidden">
                        <div
                          class="h-1.5 rounded-full transition-all duration-500"
                          :class="
                            (req.signatures?.length || 0) >= req.signers_required ? 'bg-emerald-500' : 'bg-blue-500'
                          "
                          :style="requestProgressStyle(req)"
                        ></div>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <span
                          v-for="signer in req.eligible_signers || []"
                          :key="signer"
                          class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border"
                          :class="
                            req.signatures?.find((s) => s.signer_address === signer)
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                              : 'bg-surface border-line-soft text-low'
                          "
                        >
                          {{ connectedAccount === signer ? "You" : signer.slice(0, 5) + "..." + signer.slice(-4) }}
                          <svg
                            v-if="req.signatures?.find((s) => s.signer_address === signer)"
                            class="w-3 h-3 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            ></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sign Modal -->
      <div
        v-if="signModalReq"
        ref="signModalRef"
        role="dialog"
        tabindex="0"
        aria-modal="true"
        :aria-label="$t('tools.multisig.signTransactionAria')"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
        @keydown.escape="signModalReq = null"
      >
        <div
          class="w-full max-w-lg rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col"
        >
          <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  ></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-high tracking-tight">{{ $t("tools.multisig.signTransaction") }}</h2>
            </div>
            <button
              @click="signModalReq = null"
              :aria-label="$t('tools.multisig.closeAria')"
              class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-6">
            <div>
              <p class="text-xs font-bold text-low uppercase tracking-wider mb-2">
                {{ $t("tools.multisig.unsignedPayloadHex") }}
              </p>
              <div
                class="p-3 bg-surface-muted rounded-xl border border-line-soft font-mono text-[10px] break-all text-mid overflow-y-auto max-h-32 shadow-inner"
              >
                {{ signModalReq.params?.unsigned_tx }}
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">{{ $t("tools.multisig.optionWallet") }}</label>
              <button
                @click="autoSignTx"
                :disabled="isSigning"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md"
              >
                <svg v-if="isSigning" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
                {{ isSigning ? $t("tools.multisig.awaitingWallet") : $t("tools.multisig.signWithWallet") }}
              </button>
              <p class="text-[11px] text-mid text-center">{{ $t("tools.multisig.walletSignNote") }}</p>
            </div>

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
              <div class="relative flex justify-center">
                <span
                  class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full"
                  >{{ $t("tools.multisig.or") }}</span
                >
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">{{ $t("tools.multisig.optionManual") }}</label>
              <input
                v-model="manualSignature"
                type="text"
                class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 focus:border-blue-400 transition-all outline-none"
                :placeholder="$t('tools.multisig.manualSigPlaceholder')"
              />
              <button
                @click="submitManualSignature"
                :disabled="!manualSignature || manualSignature.length < 128 || isSigning"
                class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSigning ? $t("tools.multisig.awaitingWallet") : $t("tools.multisig.submitManualSig") }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Modal -->
      <div
        v-if="detailsModalReq"
        ref="detailsModalRef"
        role="dialog"
        tabindex="0"
        aria-modal="true"
        :aria-label="$t('tools.multisig.transactionDetailsAria')"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
        @keydown.escape="detailsModalReq = null"
      >
        <div
          class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]"
        >
          <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  ></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-high tracking-tight">{{ $t("tools.multisig.requestDetailsJson") }}</h2>
            </div>
            <button
              @click="detailsModalReq = null"
              :aria-label="$t('tools.multisig.closeAria')"
              class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-6 overflow-y-auto font-mono text-xs text-mid whitespace-pre-wrap bg-surface-muted shadow-inner">
            {{ JSON.stringify(detailsModalReq, null, 2) }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useFocusTrap } from "@/composables/useFocusTrap";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { getRpcClientUrl, getCurrentEnv } from "@/utils/env";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { isGovernanceRequest, matchesRequestNetwork } from "@/utils/governanceRequests";
import { NATIVE_CONTRACTS, NEO_HASH, GAS_HASH, FLM_HASH, BNEO_HASH } from "@/constants";
import { useToast } from "vue-toastification";

const { t } = useI18n();
const toast = useToast();
const loading = ref(true);
const requests = ref([]);
const activeTab = ref("requests"); // 'requests' or 'create'

let neonJs = null;

const createForm = ref({
  description: "",
  targetContract: "",
  method: "",
  argsStr: "[]",
  pubkeys: "",
  threshold: 2,
});

const savedConfigs = ref([]);

// Derived Address computation
const derivedMultisigAddress = computed(() => {
  if (!neonJs || !createForm.value.pubkeys) return "";
  try {
    const pubkeys = createForm.value.pubkeys
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    if (pubkeys.length === 0) return "";
    const threshold = parseInt(createForm.value.threshold);
    if (isNaN(threshold) || threshold < 1 || threshold > pubkeys.length) return "";

    const sorted = [...pubkeys].sort((a, b) => a.localeCompare(b));
    const mAccount = neonJs.wallet.Account.createMultiSig(threshold, sorted);
    return mAccount.address;
  } catch (e) {
    return "";
  }
});

const isCreating = ref(false);

async function loadRequests() {
  try {
    const data = await supabaseService.getMultisigRequests();
    const activeNetwork = getCurrentEnv();
    requests.value = Array.isArray(data)
      ? data.filter(
          (request) => !isGovernanceRequest(request, NATIVE_CONTRACTS) && matchesRequestNetwork(request, activeNetwork),
        )
      : [];
  } catch (e) {
    if (import.meta.env.DEV) console.error("Error loading requests", e);
  }
}

function requestProgressStyle(req) {
  return { width: Math.min(100, ((req.signatures?.length || 0) / req.signers_required) * 100) + "%" };
}

function hasSigned(req) {
  if (!connectedAccount.value || !req.signatures) return false;
  return req.signatures.some((s) => s.signer_address === connectedAccount.value);
}

const signModalReq = ref(null);
const manualSignature = ref("");
const isSigning = ref(false);

const detailsModalReq = ref(null);
const signModalRef = ref(null);
const detailsModalRef = ref(null);
const { activate: activateSignTrap, deactivate: deactivateSignTrap } = useFocusTrap(signModalRef, { immediate: false });
const { activate: activateDetailsTrap, deactivate: deactivateDetailsTrap } = useFocusTrap(detailsModalRef, { immediate: false });
watch(signModalReq, (v) => v ? nextTick(activateSignTrap) : deactivateSignTrap());
watch(detailsModalReq, (v) => v ? nextTick(activateDetailsTrap) : deactivateDetailsTrap());
function viewDetails(req) {
  detailsModalReq.value = req;
}

function openSignModal(req) {
  signModalReq.value = req;
  manualSignature.value = "";
}

function loadSavedConfigs() {
  try {
    const saved = localStorage.getItem("neo_multisig_configs");
    if (saved) {
      savedConfigs.value = JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }
}

function saveCurrentConfig() {
  const pubkeys = createForm.value.pubkeys
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p);
  if (pubkeys.length === 0) {
    toast.error(t("tools.multisig.toasts.enterValidPubkeys"));
    return;
  }
  const threshold = parseInt(createForm.value.threshold, 10);
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > pubkeys.length) {
    toast.error(t("tools.multisig.errors.invalidThreshold"));
    return;
  }
  const name = prompt(
    t("tools.multisig.promptGroupName"),
    t("tools.multisig.defaultGroupName", { threshold, size: pubkeys.length }),
  );
  if (!name) return;

  savedConfigs.value.push({ name, pubkeys, threshold });
  localStorage.setItem("neo_multisig_configs", JSON.stringify(savedConfigs.value));
  toast.success(t("tools.multisig.toasts.groupSaved"));
}

function deleteConfig(idx) {
  if (!confirm(t("tools.multisig.confirmDelete"))) return;
  savedConfigs.value.splice(idx, 1);
  localStorage.setItem("neo_multisig_configs", JSON.stringify(savedConfigs.value));
}

function loadConfig(cfg) {
  createForm.value.pubkeys = cfg.pubkeys.join(", ");
  createForm.value.threshold = cfg.threshold;
  toast.info(t("tools.multisig.toasts.loadedGroup", { name: cfg.name }));
}

async function handleCreateRequest() {
  if (!walletService.isConnected) {
    toast.error(t("tools.multisig.toasts.connectWalletFirst"));
    return;
  }
  if (!createForm.value.description || !createForm.value.targetContract || !createForm.value.method) {
    toast.error(t("tools.multisig.toasts.fillAllRequired"));
    return;
  }

  isCreating.value = true;
  try {
    const pubkeys = createForm.value.pubkeys
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    if (pubkeys.length === 0) throw new Error(t("tools.multisig.errors.needAtLeastOnePubkey"));

    // Sort public keys lexically (standard for multisig)
    pubkeys.sort((a, b) => a.localeCompare(b));

    const threshold = parseInt(createForm.value.threshold);
    if (threshold < 1 || threshold > pubkeys.length) {
      throw new Error(t("tools.multisig.errors.invalidThreshold"));
    }

    const mAccount = neonJs.wallet.Account.createMultiSig(threshold, pubkeys);
    const eligibleSigners = pubkeys.map((pk) => new neonJs.wallet.Account(pk).address);

    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const currentHeight = await rpcClient.getBlockCount();

    let args = [];
    try {
      const parsed = JSON.parse(createForm.value.argsStr);
      if (Array.isArray(parsed)) {
        args = parsed.map((a) => neonJs.sc.ContractParam.fromJson(a));
      }
    } catch {
      throw new Error(t("tools.multisig.errors.invalidArgsJson"));
    }

    let target = createForm.value.targetContract;
    if (target.startsWith("0x")) target = target.slice(2);

    const script = neonJs.sc.createScript({ scriptHash: target, operation: createForm.value.method, args });

    const tx = new neonJs.tx.Transaction({
      signers: [{ account: mAccount.scriptHash, scopes: neonJs.tx.WitnessScope.Global }],
      validUntilBlock: currentHeight + 100000,
      systemFee: 100000000,
      networkFee: 500000000,
      script: neonJs.u.HexString.fromHex(script),
    });

    const unsignedTxHex = tx.serialize(false);

    const payload = {
      creator_address: connectedAccount.value,
      target_contract: target,
      method: createForm.value.method,
      description: createForm.value.description,
      signers_required: threshold,
      eligible_signers: eligibleSigners,
      status: "PENDING",
      network: toNetworkMode(getCurrentEnv()) || "mainnet",
      params: {
        unsigned_tx: unsignedTxHex,
        hash: tx.hash(),
        scriptHash: mAccount.scriptHash,
        pubkeys: pubkeys,
      },
    };

    const res = await supabaseService.createMultisigRequest(payload);
    if (!res.success) throw new Error(res.error);

    toast.success(t("tools.multisig.toasts.requestPublished"));

    // reset form
    createForm.value.description = "";
    createForm.value.method = "";
    createForm.value.argsStr = "[]";

    // Switch to requests view
    activeTab.value = "requests";
    await loadRequests();
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.multisig.toasts.failedToCreate", { reason: e.message }));
  } finally {
    isCreating.value = false;
  }
}

async function autoSignTx() {
  if (!signModalReq.value) return;
  isSigning.value = true;
  try {
    const unsignedTxHex = signModalReq.value.params.unsigned_tx;
    const signature = await walletService.signRawTransaction(unsignedTxHex);
    await submitSig(signature);
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.multisig.toasts.signingFailed", { reason: e.message }));
  } finally {
    isSigning.value = false;
  }
}

async function submitManualSignature() {
  if (!manualSignature.value) return;
  // Guard re-entrancy: the input has no in-flight binding, so a double-
  // click would otherwise call addMultisigSignature twice with identical
  // payload and rely on the backend to dedupe.
  if (isSigning.value) return;
  isSigning.value = true;
  try {
    await submitSig(manualSignature.value.trim());
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.multisig.toasts.signingFailed", { reason: e?.message || t("tools.multisig.toasts.signingFallbackReason") }));
  } finally {
    isSigning.value = false;
  }
}

async function submitSig(signatureHex) {
  if (!signatureHex || signatureHex.length < 128) {
    throw new Error(t("tools.multisig.errors.invalidSignatureLength"));
  }
  try {
    const res = await supabaseService.addMultisigSignature(signModalReq.value.id, connectedAccount.value, signatureHex);
    if (!res.success) throw new Error(res.error);

    toast.success(t("tools.multisig.toasts.signatureAdded"));
    signModalReq.value = null;
    await loadRequests();
  } catch (e) {
    throw new Error(t("tools.multisig.errors.submitSignatureFailed", { reason: e.message }));
  }
}

async function handleBroadcast(req) {
  if (!req.params?.unsigned_tx || !req.signatures || req.signatures.length < req.signers_required) {
    toast.error(t("tools.multisig.toasts.notEnoughSignatures"));
    return;
  }

  try {
    toast.info(t("tools.multisig.toasts.assembling"));
    const tx = neonJs.tx.Transaction.deserialize(req.params.unsigned_tx);

    const pubkeys = req.params.pubkeys;
    const sortedSignatures = [];

    for (const pubkey of pubkeys) {
      const addr = new neonJs.wallet.Account(pubkey).address;
      const sigObj = req.signatures.find((s) => s.signer_address === addr);
      if (sigObj) {
        sortedSignatures.push(sigObj.signature);
      }
      if (sortedSignatures.length >= req.signers_required) break;
    }

    if (sortedSignatures.length < req.signers_required) {
      throw new Error(t("tools.multisig.errors.notEnoughSignatures"));
    }

    const builder = new neonJs.sc.ScriptBuilder();
    for (const sig of sortedSignatures) {
      builder.emitPush(neonJs.u.HexString.fromHex(sig));
    }

    const invocationScript = builder.build();
    const verificationScript = neonJs.wallet.Account.createMultiSig(req.signers_required, pubkeys).contract.script;

    tx.witnesses = [new neonJs.tx.Witness({ invocationScript, verificationScript })];

    const signedTxHex = tx.serialize(true);

    toast.info(t("tools.multisig.toasts.broadcasting"));
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const txid = await rpcClient.sendRawTransaction(signedTxHex);

    toast.success(t("tools.multisig.toasts.broadcasted", { txid }));

    // Update local list (in production might require polling or explicit fetch)
    req.status = "EXECUTED";
    req.tx_hash = txid;
    // Assuming backend will eventually sync status
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.multisig.toasts.failedToBroadcast", { reason: e.message }));
  }
}

function handleNetworkChange() {
  void loadRequests();
}

onMounted(async () => {
  try {
    neonJs = await (await import("@/utils/neonLoader.js")).loadNeonJs();
    loadSavedConfigs();
    await loadRequests();
  } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
    toast.error(t("tools.multisig.toasts.initFailed"));
  } finally {
    loading.value = false;
  }
});

useNetworkChange(handleNetworkChange);
</script>
