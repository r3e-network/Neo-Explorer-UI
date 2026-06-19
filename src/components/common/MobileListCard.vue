<template>
  <article class="soft-divider border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-card-hover">
    <div class="flex items-start gap-3">
      <div v-if="$slots.icon" class="flex h-10 w-10 flex-shrink-0 items-center justify-center">
        <slot name="icon" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <slot name="title" />
          </div>
          <div v-if="$slots.badge" class="flex-shrink-0">
            <slot name="badge" />
          </div>
        </div>
        <div v-if="$slots.subtitle" class="mt-1 text-xs text-mid">
          <slot name="subtitle" />
        </div>
      </div>
    </div>

    <dl v-if="$slots.metrics" class="mt-3 grid grid-cols-2 gap-2">
      <slot name="metrics" />
    </dl>

    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </article>
</template>
