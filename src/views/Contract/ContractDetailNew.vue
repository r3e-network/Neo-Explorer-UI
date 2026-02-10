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
          <div class="flex flex-wrap items-center gap-2">
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

            <!-- Supported Standards -->
            <div
              v-if="supportedStandards.length"
              class="rounded-lg border border-card-border dark:border-card-border-dark"
            >
              <button
                class="flex w-full items-center justify-between p-4 text-left"
                @click="codeSection.standards = !codeSection.standards"
              >
                <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">Supported Standards</h3>
                <svg
                  class="h-4 w-4 text-gray-400 transition-transform"
                  :class="{ 'rotate-180': codeSection.standards }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                v-if="codeSection.standards"
                class="border-t border-card-border px-4 pb-4 dark:border-card-border-dark"
              >
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
              </div>
            </div>

            <!-- ABI Browser -->
            <div v-if="manifest" class="rounded-lg border border-card-border dark:border-card-border-dark">
              <button
                class="flex w-full items-center justify-between p-4 text-left"
                @click="codeSection.abi = !codeSection.abi"
              >
                <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">
                  ABI Browser
                  <span class="ml-2 text-xs font-normal text-text-secondary dark:text-gray-400">
                    ({{ abiMethods.length }} methods, {{ abiEvents.length }} events)
                  </span>
                </h3>
                <svg
                  class="h-4 w-4 text-gray-400 transition-transform"
                  :class="{ 'rotate-180': codeSection.abi }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="codeSection.abi" class="border-t border-card-border dark:border-card-border-dark">
                <!-- Methods -->
                <div v-if="abiMethods.length" class="p-4">
                  <h4
                    class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
                  >
                    Methods
                  </h4>
                  <div class="space-y-2">
                    <div
                      v-for="method in abiMethods"
                      :key="'abi-m-' + method.name"
                      class="rounded-md border border-card-border p-3 dark:border-card-border-dark"
                    >
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">{{
                          method.name
                        }}</span>
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
                  <h4
                    class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
                  >
                    Events
                  </h4>
                  <div class="space-y-2">
                    <div
                      v-for="evt in abiEvents"
                      :key="'abi-e-' + evt.name"
                      class="rounded-md border border-card-border p-3 dark:border-card-border-dark"
                    >
                      <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">{{
                        evt.name
                      }}</span>
                      <div class="mt-1 font-mono text-xs text-text-secondary dark:text-gray-400">
                        ({{ (evt.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Permissions -->
            <div
              v-if="manifest && manifest.permissions && manifest.permissions.length"
              class="rounded-lg border border-card-border dark:border-card-border-dark"
            >
              <button
                class="flex w-full items-center justify-between p-4 text-left"
                @click="codeSection.permissions = !codeSection.permissions"
              >
                <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">Permissions</h3>
                <svg
                  class="h-4 w-4 text-gray-400 transition-transform"
                  :class="{ 'rotate-180': codeSection.permissions }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="codeSection.permissions" class="border-t border-card-border dark:border-card-border-dark">
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
              </div>
            </div>

            <!-- Contract Manifest JSON -->
            <div v-if="manifest" class="rounded-lg border border-card-border dark:border-card-border-dark">
              <button
                class="flex w-full items-center justify-between p-4 text-left"
                @click="codeSection.manifest = !codeSection.manifest"
              >
                <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">Contract Manifest</h3>
                <svg
                  class="h-4 w-4 text-gray-400 transition-transform"
                  :class="{ 'rotate-180': codeSection.manifest }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="codeSection.manifest" class="border-t border-card-border dark:border-card-border-dark">
                <pre class="max-h-96 overflow-auto p-4 font-mono text-xs text-text-primary dark:text-gray-200">{{
                  JSON.stringify(manifest, null, 2)
                }}</pre>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'events'">
            <EventsTable :key="`events-${contract.hash}`" :contract-hash="contract.hash" />
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
                <button class="flex w-full items-center justify-between p-4 text-left" @click="toggleReadMethod(mIdx)">
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {{ mIdx + 1 }}
                    </span>
                    <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">{{
                      method.name
                    }}</span>
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
                        :placeholder="`${param.type}`"
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
            <div class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
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
                    To write to this contract, you need to connect a NeoLine or O3 wallet.
                  </p>
                  <button
                    class="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-400 dark:hover:bg-gray-700"
                    disabled
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    Connect Wallet
                  </button>
                </div>
              </div>
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
                class="rounded-lg border border-card-border opacity-60 dark:border-card-border-dark"
              >
                <div class="flex items-center justify-between p-4">
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      {{ wIdx + 1 }}
                    </span>
                    <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">{{
                      method.name
                    }}</span>
                    <span
                      class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Write
                    </span>
                  </div>
                </div>
                <div class="border-t border-card-border px-4 pb-3 dark:border-card-border-dark">
                  <div class="mt-2 font-mono text-xs text-text-secondary dark:text-gray-400">
                    ({{ (method.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
                    <span v-if="method.returntype"> &rarr; {{ method.returntype }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { contractService } from "@/services";
import { truncateHash, formatNumber } from "@/utils/explorerFormat";
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
      manifest: null,
      loading: false,
      activeTab: "transactions",
      tabs: getContractDetailTabs(),
      isVerified: false,
      readMethodState: [],
      codeSection: {
        standards: false,
        abi: true,
        permissions: false,
        manifest: false,
      },
    };
  },
  computed: {
    sourceCodeLocation() {
      return buildSourceCodeLocation(this.contract.hash, this.contract.updatecounter || 0);
    },
    supportedStandards() {
      if (!this.manifest) return [];
      const raw = this.manifest.supportedstandards || this.manifest.supportedStandards || [];
      return Array.isArray(raw) ? raw : [];
    },
    abiMethods() {
      const abi = this.manifest?.abi;
      if (!abi) return [];
      return Array.isArray(abi.methods) ? abi.methods : [];
    },
    abiEvents() {
      const abi = this.manifest?.abi;
      if (!abi) return [];
      return Array.isArray(abi.events) ? abi.events : [];
    },
    methodsCount() {
      return this.abiMethods.length;
    },
    eventsCount() {
      return this.abiEvents.length;
    },
    readMethods() {
      return this.abiMethods.filter((m) => m.safe === true);
    },
    writeMethods() {
      return this.abiMethods.filter((m) => m.safe !== true);
    },
  },
  watch: {
    "$route.params.hash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadContract(hash);
      },
    },
    readMethods: {
      immediate: true,
      handler(methods) {
        this.readMethodState = methods.map(() => ({
          open: false,
          params: [],
          loading: false,
          result: undefined,
          error: "",
        }));
      },
    },
  },
  methods: {
    async loadContract(hash) {
      this.loading = true;
      this.manifest = null;
      try {
        this.contract = (await contractService.getByHash(hash)) || {};

        // Load verification status and manifest in parallel
        const [, manifest] = await Promise.all([
          this.checkVerification(hash),
          contractService.getManifest(hash).catch(() => null),
        ]);
        this.manifest = manifest;
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },

    async checkVerification(hash) {
      try {
        const verified = await contractService.getVerifiedByHash(hash, this.contract.updatecounter || 0);
        this.isVerified = !!(verified && verified.hash);
      } catch {
        this.isVerified = false;
      }
    },

    nepBadgeClass(std) {
      const upper = String(std || "").toUpperCase();
      if (upper.includes("NEP-17") || upper.includes("NEP17")) {
        return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      }
      if (upper.includes("NEP-11") || upper.includes("NEP11")) {
        return "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
      }
      if (upper.includes("NEP-27") || upper.includes("NEP27")) {
        return "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
      }
      return "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
    },

    nepTooltip(std) {
      const upper = String(std || "").toUpperCase();
      if (upper.includes("NEP-17") || upper.includes("NEP17")) return "Fungible Token Standard";
      if (upper.includes("NEP-11") || upper.includes("NEP11")) return "Non-Fungible Token Standard";
      if (upper.includes("NEP-27") || upper.includes("NEP27")) return "Payable Contract Standard";
      return std;
    },

    toggleReadMethod(idx) {
      if (!this.readMethodState[idx]) return;
      this.readMethodState[idx].open = !this.readMethodState[idx].open;
    },

    async invokeReadMethod(idx, method) {
      const state = this.readMethodState[idx];
      if (!state) return;

      state.loading = true;
      state.error = "";
      state.result = undefined;

      try {
        const params = (method.parameters || []).map((p, i) => ({
          type: p.type,
          value: state.params[i] || "",
        }));
        const result = await contractService.invokeRead(this.contract.hash, method.name, params);
        state.result = result;
      } catch (err) {
        state.error = err?.message || "Invocation failed. Please check parameters and try again.";
      } finally {
        state.loading = false;
      }
    },

    formatInvokeResult(result) {
      if (result === null || result === undefined) return "null";
      if (typeof result === "string") return result;
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    },

    copyHash() {
      if (this.contract?.hash) navigator.clipboard.writeText(this.contract.hash);
    },
    truncateHash,
    formatNumber,
  },
};
</script>
