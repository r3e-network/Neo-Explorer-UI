<template>
  <div class="matrix-page bg-surface-base min-h-screen pb-12">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-line-soft bg-header-bg overflow-hidden">
      <div class="matrix-grid-bg absolute inset-0 opacity-20"></div>
      <div class="hero-gradient absolute inset-0"></div>
      <div class="page-container relative z-30 py-16 md:py-20 flex flex-col items-center">
        <Breadcrumb :items="breadcrumbs" class="mb-8 !text-emerald-400/80" />

        <div class="text-center max-w-3xl mx-auto space-y-6">
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {{ $t('matrixPage.liveOn', { network: currentNetworkLabel }) }}
          </div>

          <h1 class="text-balance text-4xl font-black tracking-tight text-white md:text-6xl drop-shadow-sm">
            {{ $t('matrixPage.heroTitlePrefix') }}
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">.matrix</span>
            {{ $t('matrixPage.heroTitleSuffix') }}
          </h1>

          <p class="text-base text-white/70 md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            {{ $t('matrixPage.heroSubtitle') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Search Section -->
    <section class="page-container relative z-40 max-w-4xl mx-auto -mt-10">
      <div
        class="p-2 bg-surface/90 backdrop-blur-2xl shadow-2xl rounded-3xl border border-line-soft/50 ring-1 ring-black/5"
      >
        <div
          class="relative flex items-center bg-surface-muted rounded-2xl border border-line-soft focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all p-1.5"
        >
          <div class="pl-4 text-emerald-500/70">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('common.searchByDomain')"
            class="w-full bg-transparent border-none px-4 py-4 text-high font-bold text-lg md:text-xl placeholder:text-mid placeholder:font-medium focus:outline-none focus:ring-0"
            @keyup.enter="handleSearch"
            :disabled="searching"
          />
          <button
            @click="handleSearch"
            :disabled="searching || !searchQuery.trim()"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed m-1"
          >
            <svg v-if="searching" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ searching ? $t('matrixPage.searching') : $t('matrixPage.searchButton') }}
          </button>
        </div>
      </div>
      <p class="text-sm text-mid mt-4 text-center font-medium">
        {{ $t('matrixPage.domainSuffixPrefix') }}
        <code class="bg-surface-muted px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400">.matrix</code>
      </p>
    </section>

    <!-- Results Section -->
    <section class="page-container max-w-4xl mx-auto mt-8">
      <transition name="fade" mode="out-in">
        <!-- Initial States / Features -->
        <div v-if="!searchResult" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div
            class="etherscan-card p-6 border-t-4 border-t-emerald-500 bg-gradient-to-b from-surface to-surface-muted/30"
          >
            <div
              class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-high mb-2">{{ $t('matrixPage.feature1Title') }}</h3>
            <p class="text-sm text-mid leading-relaxed">
              {{ $t('matrixPage.feature1Body') }}
            </p>
          </div>
          <div
            class="etherscan-card p-6 border-t-4 border-t-cyan-500 bg-gradient-to-b from-surface to-surface-muted/30"
          >
            <div
              class="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-4 text-cyan-600 dark:text-cyan-400"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-high mb-2">{{ $t('matrixPage.feature2Title') }}</h3>
            <p class="text-sm text-mid leading-relaxed">
              {{ $t('matrixPage.feature2Body') }}
            </p>
          </div>
          <div
            class="etherscan-card p-6 border-t-4 border-t-blue-500 bg-gradient-to-b from-surface to-surface-muted/30"
          >
            <div
              class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-high mb-2">{{ $t('matrixPage.feature3Title') }}</h3>
            <p class="text-sm text-mid leading-relaxed">
              {{ $t('matrixPage.feature3Body') }}
            </p>
          </div>
        </div>

        <!-- Available State -->
        <div
          v-else-if="searchResult.available"
          class="etherscan-card overflow-hidden rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-50/50 to-surface dark:from-emerald-950/20 shadow-xl"
        >
          <div class="p-8 md:p-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div class="flex-1 min-w-0 space-y-4">
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 text-sm font-bold border border-emerald-200 dark:border-emerald-800/50"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ $t('matrixPage.domainAvailable') }}
              </div>
              <h3 class="text-4xl md:text-5xl font-black text-high tracking-tight break-all">
                {{ searchResult.domain }}
              </h3>
              <p class="text-mid text-base max-w-lg">
                {{ $t('matrixPage.availableDescription') }}
              </p>
            </div>

            <div
              class="flex flex-col gap-3 min-w-[240px] shrink-0 md:self-start bg-surface p-6 rounded-2xl shadow-sm border border-line-soft"
            >
              <div class="flex justify-between items-center pb-3 border-b border-line-soft">
                <span class="text-sm font-medium text-mid">{{ $t('matrixPage.registrationFee') }}</span>
                <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">{{ $t('matrixPage.feeFree') }}</span>
              </div>
              <div class="flex justify-between items-center pb-4">
                <span class="text-sm font-medium text-mid">{{ $t('matrixPage.expiration') }}</span>
                <span class="text-sm font-bold text-high">{{ $t('matrixPage.expirationNever') }}</span>
              </div>

              <button
                @click="registerDomain"
                :disabled="!account || actionLoading"
                class="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-500 focus:ring-4 focus:ring-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="actionLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                {{ actionLoading ? $t('matrixPage.processing') : $t('matrixPage.registerDomain') }}
              </button>
              <div v-if="!account" class="text-center text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                {{ $t('matrixPage.connectWalletFirst') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Reserved State -->
        <div
          v-else-if="searchResult.reserved"
          class="etherscan-card overflow-hidden rounded-3xl border-2 border-indigo-400/50 bg-gradient-to-b from-indigo-50/50 to-surface dark:from-indigo-950/20 shadow-xl"
        >
          <div class="p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div class="flex-1 space-y-4">
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400 text-sm font-bold border border-indigo-200 dark:border-indigo-800/50"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ $t('matrixPage.domainReserved') }}
              </div>
              <h3 class="text-4xl md:text-5xl font-black text-high tracking-tight">{{ searchResult.domain }}</h3>
              <p class="text-mid text-base max-w-lg">
                {{ $t('matrixPage.reservedDescription') }}
              </p>
            </div>

            <div
              class="flex flex-col gap-3 min-w-[240px] shrink-0 bg-surface p-6 rounded-2xl shadow-sm border border-line-soft"
            >
              <div class="flex justify-between items-center pb-3 border-b border-line-soft">
                <span class="text-sm font-medium text-mid">{{ $t('matrixPage.statusLabel') }}</span>
                <span class="text-lg font-black text-indigo-600 dark:text-indigo-400">{{ $t('matrixPage.statusLocked') }}</span>
              </div>

              <button
                disabled
                class="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-surface-muted px-6 py-4 text-base font-bold text-mid shadow-inner cursor-not-allowed border border-line-soft"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  ></path>
                </svg>
                {{ $t('matrixPage.publicRegistrationDisabled') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div
          v-else-if="searchError"
          class="etherscan-card overflow-hidden rounded-3xl border-2 border-red-400/50 bg-gradient-to-b from-red-50/50 to-surface dark:from-red-950/20 shadow-xl"
        >
          <div class="p-8 md:p-10 flex items-center gap-5">
            <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-xl font-black text-red-700 dark:text-red-400">{{ $t('matrixPage.searchFailed') }}</p>
              <p class="text-sm text-red-600/80 dark:text-red-400/70 mt-1">{{ $t('matrixPage.searchFailedDescription') }}</p>
            </div>
          </div>
        </div>

        <!-- Taken State -->
        <div v-else class="etherscan-card overflow-hidden rounded-3xl shadow-xl">
          <div
            class="bg-surface-muted/50 p-8 border-b border-line-soft flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          >
            <div class="space-y-3">
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 text-sm font-bold border border-amber-200 dark:border-amber-800/50"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ $t('matrixPage.domainRegistered') }}
              </div>
              <h3 class="text-3xl md:text-4xl font-black text-high tracking-tight">{{ searchResult.domain }}</h3>
            </div>
            <div v-if="searchResult.owner === account" class="shrink-0">
              <button
                @click="showTransferModal = true"
                class="btn-outline w-full sm:w-auto px-8 py-3.5 font-bold rounded-xl bg-surface flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  ></path>
                </svg>
                {{ $t('matrixPage.transferDomain') }}
              </button>
            </div>
          </div>

          <div class="p-8">
            <h4 class="text-lg font-bold text-high mb-6">{{ $t('matrixPage.domainRecords') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">{{ $t('matrixPage.controllerOwner') }}</p>
                <div class="flex items-center gap-2">
                  <HashLink
                    v-if="searchResult.owner"
                    :hash="searchResult.owner"
                    type="address"
                    class="text-lg font-mono font-medium"
                  />
                  <span v-else class="text-low">{{ $t('matrixPage.unknownPlaceholder') }}</span>
                </div>
              </div>
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">{{ $t('matrixPage.resolutionTarget') }}</p>
                <div class="flex items-center gap-2">
                  <HashLink
                    v-if="searchResult.resolvedAddress"
                    :hash="searchResult.resolvedAddress"
                    type="address"
                    class="text-lg font-mono font-medium"
                  />
                  <span v-else class="text-low">{{ $t('matrixPage.notConfigured') }}</span>
                </div>
              </div>
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">{{ $t('matrixPage.administrativeKey') }}</p>
                <div class="flex items-center gap-2">
                  <HashLink
                    v-if="searchResult.admin"
                    :hash="searchResult.admin"
                    type="address"
                    class="text-lg font-mono font-medium"
                  />
                  <span v-else class="text-low">{{ $t('matrixPage.defaultOwner') }}</span>
                </div>
              </div>
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">{{ $t('matrixPage.statusLabel') }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-lg font-bold text-high">{{ $t('matrixPage.statusPermanent') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Transfer Modal -->
      <transition name="fade">
        <div v-if="showTransferModal" ref="transferModalRef" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" tabindex="0" aria-modal="true" :aria-label="$t('matrixPage.transferDomainAria')" @keydown.escape="showTransferModal = false">
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showTransferModal = false"></div>
          <div
            class="bg-surface-base border border-line-soft rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
          >
            <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface-muted">
              <h3 class="text-xl font-bold text-high">{{ $t('matrixPage.transferDomain') }}</h3>
              <button
                @click="showTransferModal = false"
                :aria-label="$t('matrixPage.closeTransferModal')"
                class="text-mid hover:text-high p-1 rounded-lg hover:bg-line-soft transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="p-8">
              <div
                class="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center"
              >
                <p class="text-sm text-mid mb-1 font-medium">{{ $t('matrixPage.domainAsset') }}</p>
                <p class="text-xl font-black text-emerald-700 dark:text-emerald-400">{{ searchResult.domain }}</p>
              </div>

              <div class="space-y-4 mb-8">
                <div>
                  <label class="block text-sm font-bold text-high mb-2">{{ $t('matrixPage.recipientAddress') }}</label>
                  <input
                    v-model="transferRecipient"
                    type="text"
                    :placeholder="$t('matrixPage.recipientAddressPlaceholder')"
                    class="w-full bg-surface border border-line-soft focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3.5 text-high font-mono text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                @click="transferDomain"
                :disabled="!transferRecipient || actionLoading"
                class="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg active:scale-95"
              >
                <svg v-if="actionLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ actionLoading ? $t('matrixPage.signingTransaction') : $t('matrixPage.confirmTransfer') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { useFocusTrap } from "@/composables/useFocusTrap";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import HashLink from "@/components/common/HashLink.vue";
import { connectedAccount } from "@/utils/wallet";
import nnsService from "@/services/nnsService";
import { getCurrentEnv, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { isValidNeoAddress } from "@/utils/addressFormat";
import { MATRIX_HASH_TESTNET, MATRIX_HASH_MAINNET } from "@/constants";

const { t } = useI18n();
const toast = useToast();
const account = connectedAccount;

const breadcrumbs = [{ label: "Home", to: "/homepage" }, { label: "Matrix Domain Registry" }];

const searchQuery = ref("");
const searching = ref(false);
const searchResult = ref(null);
const searchError = ref(false);

const actionLoading = ref(false);
const showTransferModal = ref(false);
const transferModalRef = ref(null);
const { activate: activateTransferTrap, deactivate: deactivateTransferTrap } = useFocusTrap(transferModalRef, { immediate: false });
watch(showTransferModal, (v) => v ? nextTick(activateTransferTrap) : deactivateTransferTrap());
const transferRecipient = ref("");
const currentNetwork = ref(getCurrentEnv());
const currentNetworkLabel = computed(() => (currentNetwork.value === "TestT5" ? "Testnet" : "Mainnet"));

function handleNetworkChange(event) {
  currentNetwork.value = event?.detail?.env || getCurrentEnv();
}

onMounted(() => {
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});

onBeforeUnmount(() => {
  window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});

const getMatrixContractHash = () =>
  getCurrentEnv() === "TestT5"
    ? import.meta.env.VITE_MATRIX_CONTRACT_HASH_TESTNET || MATRIX_HASH_TESTNET
    : import.meta.env.VITE_MATRIX_CONTRACT_HASH_MAINNET || MATRIX_HASH_MAINNET;

const RESERVED_DOMAINS = [
  "admin.matrix",
  "test.matrix",
  "system.matrix",
  "neo.matrix",
  "root.matrix",
  "registry.matrix",
  "oracle.matrix",
  "matrix.matrix",
  "jimmy.matrix",
  "erik.matrix",
  "erikzhang.matrix",
  "da.matrix",
  "dahongfei.matrix",
  "hongfei.matrix",
  "ngd.matrix",
  "r3e.matrix",
  "coz.matrix",
  "axlabs.matrix",
  "nspcc.matrix",
  "red4sec.matrix",
  "nnt.matrix",
  "neonewstoday.matrix",
  "neospcc.matrix",
  "flamingo.matrix",
  "ghostmarket.matrix",
  "forthewin.matrix",
  "neoburger.matrix",
  "ndapp.matrix",
  "onegate.matrix",
  "neoline.matrix",
  "o3.matrix",
  "nash.matrix",
  "switcheo.matrix",
  "polynetwork.matrix",
  "neocli.matrix",
  "neogo.matrix",
  "neofura.matrix",
  "grantshares.matrix",
  "frank.matrix",
  "steven.matrix",
  "john.matrix",
];

function getWalletErrorMessage(error) {
  const candidates = [
    error?.message,
    error?.description,
    error?.error?.message,
    error?.error?.description,
    error?.data?.message,
    error?.data?.description,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

async function handleSearch() {
  let query = searchQuery.value.trim().toLowerCase();
  if (!query) return;

  if (!query.endsWith(".matrix")) {
    query += ".matrix";
  }

  // Validate domain characters to prevent btoa() crashes with non-Latin characters
  if (!/^[a-z0-9.-]+$/.test(query.replace(/\.matrix$/, ""))) {
    toast.error(t('nns.toasts.invalidDomainChars'));
    return;
  }

  searchQuery.value = query;

  searching.value = true;
  searchResult.value = null;
  searchError.value = false;

  try {
    const isReserved = RESERVED_DOMAINS.includes(query);
    const profile = await nnsService.getMatrixDomainProfile(query);

    if (!profile) {
      searchResult.value = {
        domain: query,
        available: !isReserved,
        reserved: isReserved,
      };
    } else if (profile.available) {
      searchResult.value = {
        domain: query,
        available: !isReserved,
        reserved: isReserved,
      };
    } else {
      searchResult.value = {
        domain: query,
        available: false,
        reserved: false,
        owner: profile.owner,
        admin: profile.admin,
        resolvedAddress: profile.resolvedAddress,
      };
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("Search matrix failed", e);
    toast.error(t('nns.toasts.queryFailed'));
    searchError.value = true;
    searchResult.value = { domain: query };
  } finally {
    searching.value = false;
  }
}

import { addressToScriptHash } from "@/utils/neoHelpers";
import { normalizeHash160 } from "@/utils/walletNormalization";
import { invokeContract } from "@/utils/wallet";

async function registerDomain() {
  if (!account.value) {
    toast.info(t('common.connectWalletFirst'));
    return;
  }

  actionLoading.value = true;
  try {
    const domain = searchResult.value.domain;
    const scriptHash = normalizeHash160(addressToScriptHash(account.value));

    const params = [
      { type: "String", value: domain },
      { type: "Hash160", value: scriptHash },
    ];

    const txid = await invokeContract(getMatrixContractHash(), "register", params, [
      { account: scriptHash, scopes: "CalledByEntry" },
    ]);

    if (txid) {
      toast.success(t('nns.toasts.registrationSent', { txid }));
      searchResult.value.available = false;
      searchResult.value.owner = account.value;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("Register failed", e);
    const message = getWalletErrorMessage(e);
    toast.error(message ? t('nns.toasts.registrationFailedWithReason', { reason: message }) : t('nns.toasts.registrationFailed'));
  } finally {
    actionLoading.value = false;
  }
}

async function transferDomain() {
  if (!account.value || !transferRecipient.value) return;

  if (!isValidNeoAddress(transferRecipient.value.trim())) {
    toast.error(t('nns.toasts.invalidRecipient'));
    return;
  }

  actionLoading.value = true;
  try {
    const domain = searchResult.value.domain;
    const fromScriptHash = normalizeHash160(addressToScriptHash(account.value));
    const toScriptHash = normalizeHash160(addressToScriptHash(transferRecipient.value));

    const tokenIdHex = Array.from(domain)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");

    const params = [
      { type: "Hash160", value: toScriptHash },
      { type: "ByteArray", value: tokenIdHex },
      { type: "Any", value: null },
    ];

    const txid = await invokeContract(getMatrixContractHash(), "transfer", params, [
      { account: fromScriptHash, scopes: "CalledByEntry" },
    ]);

    if (txid) {
      toast.success(t('nns.toasts.transferSent', { txid }));
      showTransferModal.value = false;
      searchResult.value.owner = transferRecipient.value;
      transferRecipient.value = "";
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("Transfer failed", e);
    const message = getWalletErrorMessage(e);
    toast.error(message ? t('nns.toasts.transferFailedWithReason', { reason: message }) : t('nns.toasts.transferFailed'));
  } finally {
    actionLoading.value = false;
  }
}
</script>

<style scoped>
.hero-section {
  background-color: #0f172a; /* slate-900 base */
}

.matrix-grid-bg {
  background-image:
    linear-gradient(to right, rgba(16, 185, 129, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
  background-size: 3rem 3rem;
  background-position: center center;
  mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
}

.hero-gradient {
  background:
    radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%);
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
