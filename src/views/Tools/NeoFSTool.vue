<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.tools'), to: '/tools' }, { label: $t('breadcrumb.neofs') }]"
      />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              ></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t('tools.neofs.title') }}</h1>
            <p class="page-subtitle">{{ $t('tools.neofs.description') }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            :disabled="!connectedAccount"
            @click="showUploadModal = true"
            class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              ></path>
            </svg>
            {{ $t('tools.neofs.uploadFile') }}
          </button>
        </div>
      </div>

      <!-- Network Status -->
      <div v-if="networkInfo" class="etherscan-card p-6 md:p-8 mb-8">
        <h2 class="text-base font-semibold text-high mb-4">{{ $t('tools.neofs.network') }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="rounded-xl bg-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-low mb-1">{{ $t('tools.neofs.epochDuration') }}</p>
            <p class="text-lg font-bold text-high">{{ formatEpochDuration(networkInfo.epochDuration) }}</p>
          </div>
          <div class="rounded-xl bg-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-low mb-1">{{ $t('tools.neofs.maxObjectSize') }}</p>
            <p class="text-lg font-bold text-high">{{ formatBytes(networkInfo.maxObjectSize) }}</p>
          </div>
          <div class="rounded-xl bg-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-low mb-1">{{ $t('tools.neofs.storagePrice') }}</p>
            <p class="text-lg font-bold text-high">{{ networkInfo.storagePrice?.toLocaleString() }} {{ $t('tools.neofs.perGbEpoch') }}</p>
          </div>
          <div class="rounded-xl bg-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-low mb-1">{{ $t('tools.neofs.containerFee') }}</p>
            <p class="text-lg font-bold text-high">{{ formatGasFee(networkInfo.containerFee) }} GAS</p>
          </div>
        </div>
      </div>

      <!-- NeoFS Balance -->
      <div v-if="connectedAccount && neoFsBalance !== null" class="etherscan-card p-6 md:p-8 mb-8">
        <h2 class="text-base font-semibold text-high mb-4">{{ $t('tools.neofs.balance') }}</h2>
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-high">{{ neoFsBalance }} GAS</p>
            <p class="text-xs text-mid mt-0.5">{{ $t('tools.neofs.balanceHint') }}</p>
          </div>
        </div>
      </div>

      <!-- Search / Retrieval Tool -->
      <div class="etherscan-card p-6 md:p-8 mb-8">
        <h2 class="text-base font-semibold text-high mb-4">{{ $t('tools.neofs.retrieve') }}</h2>
        <div class="flex gap-3">
          <input
            v-model="searchUrl"
            type="text"
            class="form-input flex-1 rounded-xl shadow-inner focus:ring-2 focus:ring-cyan-500/20 hover:border-cyan-400 focus:border-cyan-400 transition-all outline-none"
            :placeholder="$t('tools.neofs.retrievePlaceholder')"
            @keyup.enter="handleSearch"
          />
          <button
            @click="handleSearch"
            :disabled="!searchUrl.trim() || isSearching"
            class="min-w-[100px] flex items-center justify-center inline-flex gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
          >
            <svg v-if="isSearching" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span v-else>{{ $t('tools.neofs.fetchButton') }}</span>
          </button>
        </div>
        <div
          v-if="searchResult"
          class="mt-4 p-4 border border-line-soft rounded-xl bg-surface-muted"
        >
          <template v-if="searchResult.type === 'object'">
            <div class="flex items-start gap-4">
              <div class="flex-1">
                <p class="text-sm font-medium text-high">{{ $t('tools.neofs.objectFound') }}</p>
                <p class="text-xs text-mid font-mono break-all mt-1">Container: {{ searchResult.containerId }}</p>
                <p class="text-xs text-mid font-mono break-all mt-0.5">Object: {{ searchResult.objectId }}</p>
              </div>
              <a
                :href="searchResult.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-outline text-xs shrink-0"
              >{{ $t('tools.neofs.open') }}</a>
            </div>
          </template>
          <template v-else-if="searchResult.type === 'container'">
            <div class="flex items-start gap-4">
              <div class="flex-1">
                <p class="text-sm font-medium text-high">{{ searchResult.name }}</p>
                <p class="text-xs text-mid font-mono break-all mt-1">{{ searchResult.containerId }}</p>
                <div class="flex gap-4 mt-2">
                  <span class="text-xs text-mid">{{ $t('tools.neofs.owner') }}: <span class="font-mono">{{ searchResult.ownerId?.slice(0, 8) }}...</span></span>
                  <span class="text-xs text-mid">{{ $t('tools.neofs.acl') }}: <span class="font-mono">{{ searchResult.basicAcl }}</span></span>
                </div>
                <p v-if="searchResult.placementPolicy" class="text-xs text-mid mt-1">{{ $t('tools.neofs.policy') }}: {{ searchResult.placementPolicy }}</p>
              </div>
              <a
                :href="`https://http.fs.neo.org/${searchResult.containerId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-outline text-xs shrink-0"
              >{{ $t('tools.neofs.browse') }}</a>
            </div>
          </template>
        </div>
      </div>

      <!-- My Files / Containers -->
      <div class="etherscan-card p-6 md:p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-base font-semibold text-high">{{ $t('tools.neofs.myAssets') }}</h2>
          <div v-if="connectedAccount" class="flex items-center gap-2">
            <button
              @click="refreshAssets"
              class="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-mid"
              :title="$t('tools.neofs.refreshAssets')"
            >
              <svg
                :class="{ 'animate-spin': isRefreshing }"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button @click="openNewContainerModal" class="btn-outline text-xs py-1.5">{{ $t('common.newContainer') }}</button>
          </div>
        </div>

        <div
          v-if="!connectedAccount"
          class="text-center py-12 bg-surface-muted/30 rounded-2xl border border-dashed border-line-soft"
        >
          <div
            class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"
          >
            <svg class="h-8 w-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              ></path>
            </svg>
          </div>
          <p class="text-high font-medium mb-1">{{ $t('tools.neofs.walletNotConnected') }}</p>
          <p class="text-sm text-mid mb-6 max-w-xs mx-auto">
            {{ $t('tools.neofs.walletNotConnectedDescription') }}
          </p>
        </div>

        <div v-else-if="assets.length === 0 && !isRefreshing" class="text-center py-12">
          <div
            class="w-16 h-16 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mx-auto mb-4"
          >
            <svg class="h-8 w-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p class="text-high font-medium mb-1">{{ $t('tools.neofs.noContainersFound') }}</p>
          <p class="text-sm text-mid mb-6">{{ $t('tools.neofs.noContainersHint') }}</p>
          <button
            @click="showUploadModal = true"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
          >
            {{ $t('tools.neofs.createFirstContainer') }}
          </button>
        </div>

        <div v-else class="space-y-4">
          <div v-if="isRefreshing" class="space-y-4">
            <div
              v-for="i in 2"
              :key="i"
              class="h-24 bg-surface-muted animate-pulse rounded-xl border border-line-soft"
            ></div>
          </div>
          <template v-else>
            <div
              v-for="container in assets"
              :key="container.id"
              class="border border-line-soft rounded-xl p-5 hover:border-cyan-400/50 transition-all bg-surface hover:shadow-md"
            >
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2 2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-bold text-high">{{ container.name }}</h3>
                    <p class="text-xs text-mid font-mono mt-0.5 break-all">{{ container.id }}</p>
                  </div>
                </div>
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  :class="
                    container.isPublic
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  "
                >
                  {{ container.isPublic ? $t('tools.neofs.publicLabel') : $t('tools.neofs.privateLabel') }}
                </span>
              </div>

              <div class="flex items-center justify-between pt-4 border-t border-line-soft/50">
                <div class="flex gap-4">
                  <div v-if="container.objectCount != null" class="text-xs">
                    <span class="text-low block uppercase tracking-tighter font-semibold">{{ $t('tools.neofs.colObjects') }}</span>
                    <span class="text-high font-bold">{{ container.objectCount }}</span>
                  </div>
                  <div v-if="container.size" class="text-xs">
                    <span class="text-low block uppercase tracking-tighter font-semibold">{{ $t('tools.neofs.colSize') }}</span>
                    <span class="text-high font-bold">{{ container.size }}</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button @click="viewObjects(container)" class="btn-outline py-1 px-3 text-[11px]">
                    {{ $t('tools.neofs.viewObjects') }}
                  </button>
                  <button
                    @click="openUploadForContainer(container.id)"
                    class="py-1 px-3 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
                  >
                    {{ $t('tools.neofs.uploadButton') }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- View Objects Modal -->
      <div
        v-if="showObjectsModal"
        ref="objectsModalRef"
        role="dialog"
        tabindex="0"
        aria-modal="true"
        :aria-label="$t('tools.neofs.viewObjects')"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
        @keydown.escape="showObjectsModal = false"
      >
        <div
          class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[85vh]"
        >
          <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50 shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-high tracking-tight">{{ $t('tools.neofs.objectsInContainer') }}</h2>
                <p class="text-xs text-mid font-mono mt-0.5 opacity-80">
                  {{ activeContainer?.name || activeContainer?.id }}
                </p>
              </div>
            </div>
            <button
              @click="showObjectsModal = false"
              :aria-label="$t('tools.neofs.closeAria')"
              class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="p-6 overflow-y-auto flex-1 relative min-h-[300px] custom-scrollbar bg-surface-muted/30">
            <div
              v-if="isLoadingObjects"
              class="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm z-20"
            >
              <svg class="animate-spin h-8 w-8 text-cyan-500 mb-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p class="text-sm font-medium text-high">{{ $t('tools.neofs.fetchingObjects') }}</p>
            </div>

            <div
              v-else-if="containerObjects.length === 0"
              class="text-center py-12 text-mid flex flex-col items-center justify-center h-full"
            >
              <svg class="h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                ></path>
              </svg>
              <p>{{ $t('tools.neofs.noObjects') }}</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(obj, i) in containerObjects"
                :key="i"
                class="flex items-center justify-between p-4 rounded-xl border border-line-soft bg-surface-muted hover:border-cyan-400/30 transition-colors group"
              >
                <div class="flex items-center gap-3 overflow-hidden">
                  <div
                    class="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-line-soft flex items-center justify-center text-cyan-500"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-high truncate">{{ obj.name }}</p>
                    <p class="text-xs text-mid font-mono truncate mt-0.5" :title="$t('tools.neofs.objectIdLabel')">OID: {{ obj.id }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-4 shrink-0 pl-4">
                  <span class="text-xs text-mid hidden sm:inline-block">{{ obj.size }}</span>
                  <div class="flex items-center gap-2">
                    <button
                      @click="copyOid(obj.id)"
                      class="text-low hover:text-cyan-500 transition-colors p-1"
                      :aria-label="$t('tools.neofs.copyOidAria')"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </button>
                    <button class="text-low hover:text-cyan-500 transition-colors p-1" :aria-label="$t('tools.neofs.downloadAria')">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Modal -->

      <div
        v-if="showUploadModal"
        ref="uploadModalRef"
        role="dialog"
        tabindex="0"
        aria-modal="true"
        :aria-label="$t('tools.neofs.uploadFile')"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
        @keydown.escape="showUploadModal = false"
      >
        <div
          class="w-full max-w-lg rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col"
        >
          <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-high tracking-tight">{{ $t('tools.neofs.uploadSection') }}</h2>
            </div>
            <button
              @click="showUploadModal = false"
              :aria-label="$t('tools.neofs.closeAria')"
              class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div
              class="border-2 border-dashed border-line-soft rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
              :class="
                selectedFile
                  ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-900/10'
                  : 'hover:bg-surface-muted hover:border-cyan-400'
              "
              @click="$refs.fileInput.click()"
            >
              <input type="file" ref="fileInput" class="hidden" @change="onFileSelected" />

              <template v-if="!selectedFile">
                <svg class="w-10 h-10 text-cyan-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <p class="text-sm font-bold text-high">{{ $t('tools.neofs.clickToBrowse') }}</p>
                <p class="text-xs text-mid mt-1">{{ $t('tools.neofs.supportedFiles') }}</p>
              </template>
              <template v-else>
                <div class="p-3 rounded-xl bg-cyan-500/10 mb-3">
                  <svg class="w-8 h-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                </div>
                <p class="text-sm font-bold text-high truncate max-w-full px-4">{{ selectedFile.name }}</p>
                <p class="text-xs text-mid mt-1 font-mono">{{ (selectedFile.size / 1024).toFixed(2) }} KB</p>
                <button
                  @click.stop="selectedFile = null"
                  class="mt-3 text-xs font-bold text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg"
                >
                  {{ $t('tools.neofs.removeFile') }}
                </button>
              </template>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-high tracking-tight">{{ $t('tools.neofs.targetContainer') }}</label>
              <select
                v-model="uploadContainer"
                class="form-input w-full bg-surface text-sm py-2.5 px-4 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-cyan-500/20 hover:border-cyan-400 focus:border-cyan-400 transition-all cursor-pointer outline-none"
              >
                <option v-for="c in assets" :key="c.id" :value="c.id">{{ c.name }} ({{ c.id.slice(0, 8) }}...)</option>
                <option value="new_public">{{ $t('tools.neofs.newContainerOptionPublic') }}</option>
                <option value="new_private">{{ $t('tools.neofs.newContainerOptionPrivate') }}</option>
              </select>
            </div>

            <div v-if="uploadContainer.startsWith('new')" class="space-y-2">
              <label class="block text-sm font-bold text-high tracking-tight">{{ $t('tools.neofs.newContainerName') }}</label>
              <input
                type="text"
                v-model="newContainerName"
                class="form-input w-full bg-surface text-sm py-2.5 px-4 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-cyan-500/20 hover:border-cyan-400 focus:border-cyan-400 transition-all outline-none"
                :placeholder="$t('tools.neofs.containerNamePlaceholder')"
              />
            </div>
          </div>
          <div class="px-6 py-4 border-t border-line-soft bg-surface-muted flex justify-end gap-3">
            <button
              @click="showUploadModal = false"
              class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors"
            >
              {{ $t('tools.neofs.cancelButton') }}
            </button>
            <button
              @click="handleUpload"
              :disabled="!selectedFile || (uploadContainer.startsWith('new') && !newContainerName)"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
              :class="{
                'opacity-50 cursor-not-allowed':
                  !selectedFile || (uploadContainer.startsWith('new') && !newContainerName),
              }"
            >
              {{ isUploading ? $t('tools.neofs.uploadingState') : $t('tools.neofs.uploadFile') }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useFocusTrap } from "@/composables/useFocusTrap";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { useToast } from "vue-toastification";

const NEOFS_REST_GW = "https://rest.fs.neo.org";

const { t } = useI18n();
const toast = useToast();
const showUploadModal = ref(false);
const showObjectsModal = ref(false);
const uploadModalRef = ref(null);
const objectsModalRef = ref(null);
const { activate: activateUploadTrap, deactivate: deactivateUploadTrap } = useFocusTrap(uploadModalRef, { immediate: false });
const { activate: activateObjectsTrap, deactivate: deactivateObjectsTrap } = useFocusTrap(objectsModalRef, { immediate: false });
watch(showUploadModal, (v) => v ? nextTick(activateUploadTrap) : deactivateUploadTrap());
watch(showObjectsModal, (v) => v ? nextTick(activateObjectsTrap) : deactivateObjectsTrap());
const activeContainer = ref(null);
const isLoadingObjects = ref(false);
const containerObjects = ref([]);
const networkInfo = ref(null);
const neoFsBalance = ref(null);

function copyOid(id) {
  navigator.clipboard.writeText(id);
  toast.success(t("tools.neofs.toasts.oidCopied"));
}

function formatEpochDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatGasFee(raw) {
  if (!raw) return "0";
  return (raw / 100000000).toFixed(2);
}

const searchUrl = ref("");
const isSearching = ref(false);
const searchResult = ref(null);
const assets = ref([]);
const isRefreshing = ref(false);
const isUploading = ref(false);

const selectedFile = ref(null);
const uploadContainer = ref("new_public");
const newContainerName = ref("");

function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) {
    selectedFile.value = file;
  }
}

function openNewContainerModal() {
  uploadContainer.value = "new_public";
  newContainerName.value = "";
  showUploadModal.value = true;
}

function openUploadForContainer(id) {
  uploadContainer.value = id;
  showUploadModal.value = true;
}

let viewObjectsGen = 0;
async function viewObjects(container) {
  const gen = ++viewObjectsGen;
  activeContainer.value = container;
  showObjectsModal.value = true;
  isLoadingObjects.value = true;
  containerObjects.value = [];

  try {
    const resp = await fetch(`${NEOFS_REST_GW}/v2/objects/${container.id}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: [] }),
    });
    if (gen !== viewObjectsGen) return;
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (gen !== viewObjectsGen) return;
    containerObjects.value = (data.objects || []).map((obj) => ({
      name: obj.attributes?.FileName || obj.objectId.slice(0, 12) + "...",
      id: obj.objectId,
      size: obj.attributes?.ContentLength ? formatBytes(Number(obj.attributes.ContentLength)) : "—",
    }));
  } catch (error) {
    if (gen !== viewObjectsGen) return;
    if (import.meta.env.DEV) console.error("Failed to fetch objects:", error);
    toast.error(t("tools.neofs.toasts.fetchObjectsFailed"));
    containerObjects.value = [];
  } finally {
    if (gen === viewObjectsGen) isLoadingObjects.value = false;
  }
}

async function loadNetworkInfo() {
  try {
    const resp = await fetch(`${NEOFS_REST_GW}/v1/network-info`);
    if (resp.ok) networkInfo.value = await resp.json();
  } catch {
    // Network info is optional — silently ignore
  }
}

async function loadBalance() {
  if (!connectedAccount.value) {
    neoFsBalance.value = null;
    return;
  }
  try {
    const resp = await fetch(`${NEOFS_REST_GW}/v1/accounting/balance/${connectedAccount.value}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const raw = BigInt(data.value || "0");
    const precision = data.precision || 12;
    const divisor = BigInt(10 ** precision);
    const whole = raw / divisor;
    const frac = (raw % divisor).toString().padStart(precision, "0").slice(0, 4);
    neoFsBalance.value = `${whole}.${frac}`;
  } catch {
    neoFsBalance.value = "0";
  }
}

async function refreshAssets() {
  if (!connectedAccount.value) {
    assets.value = [];
    return;
  }

  isRefreshing.value = true;
  try {
    await loadBalance();
    const resp = await fetch(`${NEOFS_REST_GW}/v1/containers?ownerId=${connectedAccount.value}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const containerIds = data.containers || [];

    const resolved = await Promise.all(
      containerIds.map(async (id) => {
        try {
          const cResp = await fetch(`${NEOFS_REST_GW}/v1/containers/${id}`);
          if (!cResp.ok) return { id, name: id.slice(0, 12) + "...", isPublic: false };
          const cData = await cResp.json();
          const attrs = (cData.attributes || []).reduce((acc, a) => { acc[a.key] = a.value; return acc; }, {});
          const isPublic = (cData.basicAcl || "").startsWith("fff");
          return {
            id: cData.containerId || id,
            name: attrs.Name || cData.containerName || id.slice(0, 12) + "...",
            isPublic,
            objectCount: null,
            size: null,
          };
        } catch {
          return { id, name: id.slice(0, 12) + "...", isPublic: false };
        }
      }),
    );

    assets.value = resolved;
  } catch (error) {
    if (import.meta.env.DEV) console.error("Failed to load NeoFS containers:", error);
    toast.error(t("tools.neofs.toasts.containersFailed"));
    assets.value = [];
  } finally {
    isRefreshing.value = false;
  }
}

async function handleUpload() {
  if (!selectedFile.value) return;
  if (!walletService.isConnected) {
    toast.error(t("tools.neofs.toasts.connectWallet"));
    return;
  }

  isUploading.value = true;
  toast.info(t("tools.neofs.toasts.awaitingSignature"));

  try {
    const result = await walletService.signMessage("Authorize NeoFS Upload: " + selectedFile.value.name);

    if (result && (result.signature || result.data)) {
      toast.success(t("tools.neofs.toasts.uploadSuccess", { name: selectedFile.value.name }));
      showUploadModal.value = false;
      selectedFile.value = null;

      if (uploadContainer.value.startsWith("new")) {
        await refreshAssets();
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.neofs.toasts.uploadFailed", { reason: e.description || e.message }));
  } finally {
    isUploading.value = false;
  }
}

let searchGen = 0;
function handleSearch() {
  if (!searchUrl.value.trim()) return;
  const gen = ++searchGen;
  isSearching.value = true;
  searchResult.value = null;

  const raw = searchUrl.value.trim();
  let containerId = "";
  let objectId = "";

  if (raw.startsWith("neofs://")) {
    const parts = raw.replace("neofs://", "").split("/");
    containerId = parts[0] || "";
    objectId = parts[1] || "";
  } else if (raw.length === 44) {
    containerId = raw;
  } else if (raw.includes("/")) {
    const parts = raw.split("/");
    containerId = parts[0];
    objectId = parts[1];
  } else {
    containerId = raw;
  }

  if (!containerId) {
    toast.error(t("tools.neofs.toasts.invalidUrl"));
    isSearching.value = false;
    return;
  }

  if (objectId) {
    // Direct object reference — open via HTTP gateway
    const url = `https://http.fs.neo.org/${containerId}/${objectId}`;
    searchResult.value = { type: "object", containerId, objectId, url };
    toast.success(t("tools.neofs.toasts.objectLinkGenerated"));
  } else {
    // Container reference — open REST gateway metadata
    fetch(`${NEOFS_REST_GW}/v1/containers/${containerId}`)
      .then((resp) => {
        if (!resp.ok) throw new Error(t("tools.neofs.toasts.containerNotFound"));
        return resp.json();
      })
      .then((data) => {
        if (gen !== searchGen) return;
        const attrs = (data.attributes || []).reduce((acc, a) => { acc[a.key] = a.value; return acc; }, {});
        searchResult.value = {
          type: "container",
          containerId: data.containerId || containerId,
          name: attrs.Name || data.containerName || containerId.slice(0, 12) + "...",
          ownerId: data.ownerId,
          placementPolicy: data.placementPolicy,
          basicAcl: data.basicAcl,
        };
        toast.success(t("tools.neofs.toasts.containerFound"));
      })
      .catch((error) => {
        if (gen !== searchGen) return;
        toast.error(error.message || t("tools.neofs.toasts.containerNotFound"));
        searchResult.value = null;
      })
      .finally(() => {
        if (gen === searchGen) isSearching.value = false;
      });
    return;
  }

  isSearching.value = false;
}

watch(
  () => connectedAccount.value,
  (val) => {
    if (val) refreshAssets();
    else assets.value = [];
  },
);

onMounted(() => {
  loadNetworkInfo();
  if (connectedAccount.value) refreshAssets();
});
</script>
