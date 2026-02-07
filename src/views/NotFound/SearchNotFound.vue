<template>
  <div class="search-not-found">
    <section class="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-8">
      <div class="w-full max-w-xl etherscan-card p-8 text-center">
        <div class="mb-4 text-6xl">🔎</div>
        <h1 class="text-2xl font-semibold text-text-primary dark:text-gray-100">No Results Found</h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-text-secondary dark:text-gray-400">
          Try searching by transaction hash, block hash/height, contract hash, or Neo address.
        </p>

        <div
          class="mt-6 rounded-md border border-card-border bg-gray-50 p-4 text-left dark:border-card-border-dark dark:bg-gray-800"
        >
          <ul class="space-y-2 text-sm text-text-secondary dark:text-gray-300">
            <li>• Block height or block hash</li>
            <li>• Transaction hash</li>
            <li>• Neo address (`N...`)</li>
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

<script>
export default {
  name: "SearchNotFound",
};
</script>
