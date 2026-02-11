<template>
  <div class="page-not-found">
    <section class="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-8">
      <div class="w-full max-w-lg etherscan-card p-8 text-center">
        <!-- 404 SVG Icon -->
        <div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg class="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p class="text-7xl font-bold text-gray-200 dark:text-gray-700">404</p>
        <h1 class="mt-2 text-2xl font-semibold text-text-primary dark:text-gray-100">Page Not Found</h1>
        <p class="mt-2 text-sm text-text-secondary dark:text-gray-400">
          The requested page does not exist or may have been moved.
        </p>

        <div class="mt-6 flex items-center justify-center gap-3">
          <router-link
            to="/homepage"
            class="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Back to Homepage
          </router-link>
          <router-link
            to="/blocks/1"
            class="rounded-md border border-card-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Browse Blocks
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup></script>
