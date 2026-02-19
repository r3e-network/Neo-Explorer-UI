<template>
  <div class="page-not-found">
    <section
      class="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-8"
    >
      <div class="w-full max-w-lg etherscan-card p-8 text-center">
        <!-- 404 SVG Icon -->
        <div
          class="bg-icon-primary mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full"
        >
          <svg
            class="text-mid h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p class="text-low text-7xl font-bold">404</p>
        <h1 class="mt-2 page-title">Page Not Found</h1>
        <p class="text-mid mt-2 text-sm">
          The requested page does not exist or may have been moved.
        </p>

        <div class="mt-6 flex items-center justify-center gap-3">
          <router-link
            to="/homepage"
            class="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Back to Homepage
          </router-link>
          <router-link to="/blocks/1" class="btn-outline px-4 py-2">
            Browse Blocks
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup></script>
