<template>
  <div class="search-not-found">
    <section class="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-8">
      <div class="w-full max-w-xl etherscan-card p-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg class="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h1 class="page-title">No Results Found</h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-text-secondary dark:text-gray-400">
          Try searching by transaction hash, block hash/height, contract hash, or Neo address.
        </p>

        <div
          class="mt-6 rounded-md border border-card-border bg-gray-50 p-4 text-left dark:border-card-border-dark dark:bg-gray-800"
        >
          <ul class="space-y-2 text-sm text-text-secondary dark:text-gray-300">
            <li>• Block height or block hash</li>
            <li>• Transaction hash</li>
            <li>• Neo address (N...)</li>
            <li>• Contract hash</li>
          </ul>
        </div>

        <router-link
          to="/homepage"
          class="mt-6 inline-block rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          Back to Homepage
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup></script>
