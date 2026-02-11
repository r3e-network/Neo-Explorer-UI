<template>
  <div class="contract-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Contracts', to: '/contracts/1' },
          { label: contract.name || 'Contract' },
        ]"
      />

      <!-- Contract Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          </svg>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold text-text-primary dark:text-gray-100">
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
            <span
              v-for="std in supportedStandards"
              :key="std"
              class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              :class="nepBadgeClass(std)"
              :title="nepTooltip(std)"
            >
              {{ std }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-text-secondary dark:text-gray-400">
              {{ truncateHash(contract.hash, 12, 8) }}
            </span>
            <button @click="copyHash" aria-label="Copy contract hash" class="text-gray-400 hover:text-primary-500">
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

      <!-- Error State -->
      <ErrorState v-if="error" title="Contract not found" :message="error" @retry="loadContract(route.params.hash)" />

      <!-- Overview Card -->
      <div v-if="!error" class="mb-6 etherscan-card">
        <div class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
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
          <InfoRow
            label="Methods Count"
            tooltip="Number of methods in the contract ABI"
            :value="String(methodsCount)"
          />
          <InfoRow label="Events Count" tooltip="Number of events in the contract ABI" :value="String(eventsCount)" />
        </div>
      </div>

      <!-- Tabs Card -->
      <div v-if="!error" class="etherscan-card">
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
            </button>
          </nav>
        </div>

        <div class="p-4 md:p-5">
          <div v-if="!contract.hash" class="py-8 text-center text-text-secondary dark:text-gray-400">
            Loading contract details...
          </div>

          <!-- Transactions Tab -->
          <div v-else-if="activeTab === 'transactions'">
            <ScCallTable :key="`sc-${contract.hash}`" :contract-hash="contract.hash" />
          </div>

          <!-- Events Tab -->
          <div v-else-if="activeTab === 'events'">
            <EventsTable :key="`events-${contract.hash}`" :contract-hash="contract.hash" />
          </div>

          <!-- Code / Source Tab -->
          <div v-else-if="activeTab === 'code'" class="space-y-6">
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

            <!-- Supported Standards Collapsible -->
            <CollapsibleSection v-if="supportedStandards.length" title="Supported Standards" :default-open="false">
              <div class="flex flex-wrap gap-2 pt-3">
                <span
                  v-for="std in supportedStandards"
                  :key="'cs-' + std"
                  class="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium"
                  :class="nepBadgeClass(std)"
                  :title="nepTooltip(std)"
                >
                  {{ std }}
                </span>
              </div>
            </CollapsibleSection>

            <!-- ABI Browser Collapsible -->
            <CollapsibleSection v-if="manifest" title="ABI Browser" :default-open="true">
              <template #title-suffix>
                <span class="ml-2 text-xs font-normal text-text-secondary dark:text-gray-400">
                  ({{ abiMethods.length }} methods, {{ abiEvents.length }} events)
                </span>
              </template>
              <!-- Methods -->
              <div v-if="abiMethods.length" class="p-4">
                <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
                  Methods
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="method in abiMethods"
                    :key="'abi-m-' + method.name"
                    class="rounded-md border border-card-border p-3 dark:border-card-border-dark"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
                        {{ method.name }}
                      </span>
                      <span
                        class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                        :class="
                          method.safe
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        "
                      >
                        {{ method.safe ? "Safe" : "Unsafe" }}
                      </span>
                    </div>
                    <div class="mt-1 font-mono text-xs text-text-secondary dark:text-gray-400">
                      ({{ (method.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
                      <span v-if="method.returntype"> &rarr; {{ method.returntype }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Events -->
              <div v-if="abiEvents.length" class="border-t border-card-border p-4 dark:border-card-border-dark">
                <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
                  Events
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="evt in abiEvents"
                    :key="'abi-e-' + evt.name"
                    class="rounded-md border border-card-border p-3 dark:border-card-border-dark"
                  >
                    <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
                      {{ evt.name }}
                    </span>
                    <div class="mt-1 font-mono text-xs text-text-secondary dark:text-gray-400">
                      ({{ (evt.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <!-- Permissions Collapsible -->
            <CollapsibleSection
              v-if="manifest && manifest.permissions && manifest.permissions.length"
              title="Permissions"
              :default-open="false"
            >
              <div class="divide-y divide-card-border dark:divide-card-border-dark">
                <div
                  v-for="(perm, idx) in manifest.permissions"
                  :key="'perm-' + idx"
                  class="flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-4"
                >
                  <span class="font-mono text-sm text-text-primary dark:text-gray-200">
                    {{ perm.contract || "*" }}
                  </span>
                  <span class="text-xs text-text-secondary dark:text-gray-400">
                    Methods: {{ Array.isArray(perm.methods) ? perm.methods.join(", ") : "*" }}
                  </span>
                </div>
              </div>
            </CollapsibleSection>

            <!-- Contract Manifest JSON Collapsible -->
            <CollapsibleSection v-if="manifest" title="Contract Manifest" :default-open="false">
              <pre class="max-h-96 overflow-auto p-4 font-mono text-xs text-text-primary dark:text-gray-200">{{
                JSON.stringify(manifest, null, 2)
              }}</pre>
            </CollapsibleSection>
          </div>

          <!-- Read Contract Tab -->
          <div v-else-if="activeTab === 'readContract'" class="space-y-4">
            <div v-if="!manifest" class="py-8 text-center text-text-secondary dark:text-gray-400">
              Loading contract manifest...
            </div>
            <div v-else-if="!readMethods.length" class="py-8 text-center text-text-secondary dark:text-gray-400">
              No read-only (Safe) methods found in this contract.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="(method, mIdx) in readMethods"
                :key="'rm-' + method.name"
                class="rounded-lg border border-card-border dark:border-card-border-dark"
              >
                <button
                  class="flex w-full items-center justify-between p-4 text-left"
                  :aria-label="`Toggle ${method.name} method details`"
                  :aria-expanded="readMethodState[mIdx]?.open"
                  @click="toggleReadMethod(mIdx)"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {{ mIdx + 1 }}
                    </span>
                    <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
                      {{ method.name }}
                    </span>
                  </div>
                  <svg
                    class="h-4 w-4 text-gray-400 transition-transform"
                    :class="{ 'rotate-180': readMethodState[mIdx]?.open }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  v-if="readMethodState[mIdx]?.open"
                  class="border-t border-card-border px-4 pb-4 dark:border-card-border-dark"
                >
                  <!-- Parameters -->
                  <div v-if="method.parameters && method.parameters.length" class="mt-3 space-y-2">
                    <div v-for="(param, pIdx) in method.parameters" :key="'rp-' + pIdx" class="flex flex-col gap-1">
                      <label class="text-xs font-medium text-text-secondary dark:text-gray-400">
                        {{ param.name }} <span class="text-[10px]">({{ param.type }})</span>
                      </label>
                      <input
                        v-model="readMethodState[mIdx].params[pIdx]"
                        type="text"
                        :placeholder="param.type"
                        :aria-label="`Parameter ${param.name}`"
                        class="rounded-md border border-card-border bg-white px-3 py-2 font-mono text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-card-border-dark dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div v-else class="mt-3 text-xs text-text-secondary dark:text-gray-400">No parameters required.</div>
                  <!-- Query button -->
                  <button
                    class="mt-3 inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="readMethodState[mIdx]?.loading"
                    @click="invokeReadMethod(mIdx, method)"
                  >
                    <svg
                      v-if="readMethodState[mIdx]?.loading"
                      class="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Query
                  </button>
                  <!-- Result -->
                  <div
                    v-if="readMethodState[mIdx]?.result !== undefined"
                    class="mt-3 rounded-md border border-card-border bg-gray-50 p-3 dark:border-card-border-dark dark:bg-gray-800/40"
                  >
                    <h5 class="mb-1 text-xs font-semibold text-text-secondary dark:text-gray-400">Result:</h5>
                    <pre class="max-h-48 overflow-auto font-mono text-xs text-text-primary dark:text-gray-200">{{
                      formatInvokeResult(readMethodState[mIdx].result)
                    }}</pre>
                  </div>
                  <!-- Error -->
                  <div
                    v-if="readMethodState[mIdx]?.error"
                    class="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                  >
                    <p class="text-xs text-red-600 dark:text-red-400">{{ readMethodState[mIdx].error }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Write Contract Tab -->
          <div v-else-if="activeTab === 'writeContract'" class="space-y-4">
            <!-- Wallet Connection Banner -->
            <div
              v-if="!walletConnected"
              class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <div class="flex items-start gap-3">
                <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div>
                  <h3 class="text-sm font-semibold text-amber-800 dark:text-amber-300">Connect Wallet to Interact</h3>
                  <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">
                    To write to this contract, connect a NeoLine or O3 wallet.
                  </p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      class="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-400 dark:hover:bg-gray-700"
                      :disabled="walletConnecting"
                      @click="connectWallet('NeoLine')"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      {{ walletConnecting ? "Connecting..." : "NeoLine" }}
                    </button>
                    <button
                      class="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-400 dark:hover:bg-gray-700"
                      :disabled="walletConnecting"
                      @click="connectWallet('O3')"
                    >
                      {{ walletConnecting ? "Connecting..." : "O3 Wallet" }}
                    </button>
                  </div>
                  <p v-if="walletError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ walletError }}</p>
                </div>
              </div>
            </div>

            <!-- Connected wallet banner -->
            <div
              v-if="walletConnected"
              class="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
            >
              <div class="flex items-center gap-2">
                <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-medium text-green-800 dark:text-green-300">
                  Connected: {{ walletAccount?.address ? truncateHash(walletAccount.address, 8, 6) : "" }}
                </span>
                <span
                  class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  {{ walletProvider }}
                </span>
              </div>
              <button
                class="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
                @click="disconnectWallet"
              >
                Disconnect
              </button>
            </div>

            <div v-if="!manifest" class="py-8 text-center text-text-secondary dark:text-gray-400">
              Loading contract manifest...
            </div>
            <div v-else-if="!writeMethods.length" class="py-8 text-center text-text-secondary dark:text-gray-400">
              No write methods found in this contract.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="(method, wIdx) in writeMethods"
                :key="'wm-' + method.name"
                class="rounded-lg border border-card-border dark:border-card-border-dark"
              >
                <!-- Method header (clickable) -->
                <button
                  class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  :aria-expanded="writeMethodState[wIdx]?.open"
                  @click="toggleWriteMethod(wIdx)"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      {{ wIdx + 1 }}
                    </span>
                    <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
                      {{ method.name }}
                    </span>
                    <span
                      class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Write
                    </span>
                  </div>
                  <svg
                    class="h-4 w-4 text-gray-400 transition-transform duration-200"
                    :class="{ 'rotate-180': writeMethodState[wIdx]?.open }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <!-- Expandable method body -->
                <div
                  v-if="writeMethodState[wIdx]?.open"
                  class="border-t border-card-border px-4 pb-4 dark:border-card-border-dark"
                >
                  <!-- Parameters -->
                  <div v-if="method.parameters && method.parameters.length" class="mt-3 space-y-2">
                    <div v-for="(param, pIdx) in method.parameters" :key="'wp-' + pIdx" class="flex flex-col gap-1">
                      <label class="text-xs font-medium text-text-secondary dark:text-gray-400">
                        {{ param.name }} <span class="text-[10px]">({{ param.type }})</span>
                      </label>
                      <input
                        v-model="writeMethodState[wIdx].params[pIdx]"
                        type="text"
                        :placeholder="param.type"
                        :aria-label="`Parameter ${param.name}`"
                        class="rounded-md border border-card-border bg-white px-3 py-2 font-mono text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-card-border-dark dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div v-else class="mt-3 text-xs text-text-secondary dark:text-gray-400">No parameters required.</div>
                  <!-- Invoke button -->
                  <button
                    class="mt-3 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    :class="walletConnected ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-400 cursor-not-allowed'"
                    :disabled="!walletConnected || writeMethodState[wIdx]?.loading"
                    @click="invokeWriteMethod(wIdx, method)"
                  >
                    <svg
                      v-if="writeMethodState[wIdx]?.loading"
                      class="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {{
                      !walletConnected
                        ? "Connect Wallet First"
                        : writeMethodState[wIdx]?.loading
                        ? "Sending..."
                        : "Write"
                    }}
                  </button>
                  <!-- Result -->
                  <div
                    v-if="writeMethodState[wIdx]?.result !== undefined"
                    class="mt-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
                  >
                    <h5 class="mb-1 text-xs font-semibold text-green-700 dark:text-green-400">Transaction Submitted</h5>
                    <p class="break-all font-mono text-xs text-green-800 dark:text-green-300">
                      TxID: {{ writeMethodState[wIdx].result?.txid || writeMethodState[wIdx].result }}
                    </p>
                  </div>
                  <!-- Error -->
                  <div
                    v-if="writeMethodState[wIdx]?.error"
                    class="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                  >
                    <p class="text-xs text-red-600 dark:text-red-400">{{ writeMethodState[wIdx].error }}</p>
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
import { contractService } from "@/services";
import { walletService } from "@/services/walletService";
import { truncateHash, formatNumber } from "@/utils/explorerFormat";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
import InfoRow from "@/components/common/InfoRow.vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import ScCallTable from "@/views/Contract/ScCallTable.vue";
import EventsTable from "@/views/Contract/EventsTable.vue";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";

const route = useRoute();

// State
const abortController = ref(null);
const contract = ref({});
const manifest = ref(null);
const loading = ref(false);
const error = ref(null);
const activeTab = ref("transactions");
const tabs = getContractDetailTabs();
const isVerified = ref(false);
const readMethodState = ref([]);

// Wallet state
const walletConnected = ref(false);
const walletAccount = ref(null);
const walletProvider = ref(null);
const walletConnecting = ref(false);
const walletError = ref("");
const writeMethodState = ref([]);

// Computed - source code link
const sourceCodeLocation = computed(() =>
  buildSourceCodeLocation(contract.value.hash, contract.value.updatecounter || 0)
);

// Computed - manifest-derived data
const supportedStandards = computed(() => {
  if (!manifest.value) return [];
  const raw = manifest.value.supportedstandards || manifest.value.supportedStandards || [];
  return Array.isArray(raw) ? raw : [];
});

const abiMethods = computed(() => {
  const abi = manifest.value?.abi;
  return abi && Array.isArray(abi.methods) ? abi.methods : [];
});

const abiEvents = computed(() => {
  const abi = manifest.value?.abi;
  return abi && Array.isArray(abi.events) ? abi.events : [];
});

const methodsCount = computed(() => abiMethods.value.length);
const eventsCount = computed(() => abiEvents.value.length);
const readMethods = computed(() => abiMethods.value.filter((m) => m.safe === true));
const writeMethods = computed(() => abiMethods.value.filter((m) => m.safe !== true));

// NEP badge helpers — static lookup map (avoids per-render string matching)
const NEP_BADGE_DEFAULT =
  "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
const NEP_BADGE_CLASSES = Object.freeze({
  "NEP-17":
    "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  NEP17: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "NEP-11":
    "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  NEP11:
    "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  "NEP-27":
    "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  NEP27:
    "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
});

function nepBadgeClass(std) {
  return NEP_BADGE_CLASSES[String(std || "").toUpperCase()] || NEP_BADGE_DEFAULT;
}

function nepTooltip(std) {
  const upper = String(std || "").toUpperCase();
  if (upper.includes("NEP-17") || upper.includes("NEP17")) return "Fungible Token Standard";
  if (upper.includes("NEP-11") || upper.includes("NEP11")) return "Non-Fungible Token Standard";
  if (upper.includes("NEP-27") || upper.includes("NEP27")) return "Payable Contract Standard";
  return std;
}

// Data loading
async function loadContract(hash) {
  abortController.value?.abort();
  abortController.value = new AbortController();
  loading.value = true;
  error.value = null;
  manifest.value = null;
  try {
    contract.value = (await contractService.getByHash(hash)) || {};
    if (abortController.value?.signal.aborted) return;
    const [, manifestData] = await Promise.all([
      checkVerification(hash),
      contractService.getManifest(hash).catch(() => null),
    ]);
    if (abortController.value?.signal.aborted) return;
    manifest.value = manifestData;
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load contract:", err);
    error.value = "Failed to load contract details. Please try again.";
  } finally {
    loading.value = false;
  }
}

async function checkVerification(hash) {
  try {
    const verified = await contractService.getVerifiedByHash(hash, contract.value.updatecounter || 0);
    isVerified.value = !!(verified && verified.hash);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Contract verification check failed:", err);
    isVerified.value = false;
  }
}

// Read Contract interaction
function toggleReadMethod(idx) {
  if (!readMethodState.value[idx]) return;
  readMethodState.value[idx].open = !readMethodState.value[idx].open;
}

async function invokeReadMethod(idx, method) {
  const state = readMethodState.value[idx];
  if (!state) return;
  state.loading = true;
  state.error = "";
  state.result = undefined;
  try {
    const params = (method.parameters || []).map((p, i) => ({
      type: p.type,
      value: state.params[i] || "",
    }));
    state.result = await contractService.invokeRead(contract.value.hash, method.name, params);
  } catch (err) {
    state.error = err?.message || "Invocation failed. Please check parameters and try again.";
  } finally {
    state.loading = false;
  }
}

function formatInvokeResult(result) {
  if (result === null || result === undefined) return "null";
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function copyHash() {
  if (contract.value?.hash) navigator.clipboard.writeText(contract.value.hash);
}

onBeforeUnmount(() => {
  abortController.value?.abort();
});

// Route watcher - load contract on hash change
watch(
  () => route.params.hash,
  (hash) => {
    if (hash) loadContract(hash);
  },
  { immediate: true }
);

// Rebuild read method state when manifest changes
watch(
  readMethods,
  (methods) => {
    readMethodState.value = methods.map(() => ({
      open: false,
      params: [],
      loading: false,
      result: undefined,
      error: "",
    }));
  },
  { immediate: true }
);

// Rebuild write method state when manifest changes
watch(
  writeMethods,
  (methods) => {
    writeMethodState.value = methods.map(() => ({
      open: false,
      params: [],
      loading: false,
      result: undefined,
      error: "",
    }));
  },
  { immediate: true }
);

// --- Wallet Methods ---
async function connectWallet(providerName) {
  walletConnecting.value = true;
  walletError.value = "";
  try {
    const account = await walletService.connect(providerName);
    walletConnected.value = true;
    walletAccount.value = account;
    walletProvider.value = providerName;
  } catch (err) {
    walletError.value = err?.message || "Failed to connect wallet";
  } finally {
    walletConnecting.value = false;
  }
}

function disconnectWallet() {
  walletService.disconnect();
  walletConnected.value = false;
  walletAccount.value = null;
  walletProvider.value = null;
  walletError.value = "";
}

function toggleWriteMethod(idx) {
  if (!writeMethodState.value[idx]) return;
  writeMethodState.value[idx].open = !writeMethodState.value[idx].open;
}

async function invokeWriteMethod(idx, method) {
  const state = writeMethodState.value[idx];
  if (!state) return;
  state.loading = true;
  state.error = "";
  state.result = undefined;
  try {
    const args = (method.parameters || []).map((p, i) => ({
      type: p.type,
      value: state.params[i] || "",
    }));
    const result = await walletService.invoke({
      scriptHash: contract.value.hash,
      operation: method.name,
      args,
    });
    state.result = result;
  } catch (err) {
    state.error = err?.message || "Transaction failed. Please check parameters.";
  } finally {
    state.loading = false;
  }
}
</script>
