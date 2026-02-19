<template>
  <div class="search-not-found">
    <section class="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-8">
      <div class="w-full max-w-xl etherscan-card p-8 text-center">
        <div class="bg-icon-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg class="text-mid h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h1 class="page-title">No Results Found</h1>
        <p class="text-mid mx-auto mt-2 max-w-md text-sm">
          Try searching by transaction hash, block hash/height, contract hash, or Neo address.
        </p>

        <div class="panel-muted mt-6 p-4 text-left">
          <ul class="text-mid space-y-2 text-sm">
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
