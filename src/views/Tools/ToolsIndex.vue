<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: $t('nav.home'), to: '/homepage' }, { label: $t('tools.title') }]" />

      <div class="mb-8 flex items-start gap-3">
        <div class="page-header-icon bg-icon-primary">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            ></path>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ $t("tools.title") }}</h1>
          <p class="page-subtitle">{{ $t("tools.subtitle") }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <router-link
          v-for="tool in tools"
          :key="tool.to"
          :to="tool.to"
          class="etherscan-card group flex min-h-[11rem] flex-col items-start gap-4 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
          :aria-label="$t(tool.titleKey)"
        >
          <div :class="tool.iconClass">
            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tool.iconPath"></path>
            </svg>
          </div>
          <div class="min-w-0">
            <h2
              class="text-lg font-bold tracking-tight text-high transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400"
            >
              {{ $t(tool.titleKey) }}
            </h2>
            <p class="mt-1.5 text-sm leading-relaxed text-mid">{{ $t(tool.descriptionKey) }}</p>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import Breadcrumb from "@/components/common/Breadcrumb.vue";

const baseIconClass =
  "flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110";

const iconThemes = {
  amber:
    "border-amber-100 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 dark:border-amber-800/30 dark:from-amber-900/40 dark:to-amber-800/20 dark:text-amber-400",
  primary:
    "border-primary-100 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 dark:border-primary-800/30 dark:from-primary-900/40 dark:to-primary-900/20 dark:text-primary-400",
  cyan:
    "border-cyan-100 bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-600 dark:border-cyan-800/30 dark:from-cyan-900/40 dark:to-cyan-800/20 dark:text-cyan-400",
  emerald:
    "border-emerald-100 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 dark:border-emerald-800/30 dark:from-emerald-900/40 dark:to-emerald-800/20 dark:text-emerald-400",
  fuchsia:
    "border-fuchsia-100 bg-gradient-to-br from-fuchsia-100 to-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-800/30 dark:from-fuchsia-900/40 dark:to-fuchsia-800/20 dark:text-fuchsia-400",
  indigo:
    "border-indigo-100 bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 dark:border-indigo-800/30 dark:from-indigo-900/40 dark:to-indigo-800/20 dark:text-indigo-400",
  orange:
    "border-orange-100 bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 dark:border-orange-800/30 dark:from-orange-900/40 dark:to-orange-800/20 dark:text-orange-400",
  pink:
    "border-pink-100 bg-gradient-to-br from-pink-100 to-pink-50 text-pink-600 dark:border-pink-800/30 dark:from-pink-900/40 dark:to-pink-800/20 dark:text-pink-400",
  rose:
    "border-rose-100 bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 dark:border-rose-800/30 dark:from-rose-900/40 dark:to-rose-800/20 dark:text-rose-400",
  teal:
    "border-teal-100 bg-gradient-to-br from-teal-100 to-teal-50 text-teal-600 dark:border-teal-800/30 dark:from-teal-900/40 dark:to-teal-800/20 dark:text-teal-400",
  violet:
    "border-violet-100 bg-gradient-to-br from-violet-100 to-violet-50 text-violet-600 dark:border-violet-800/30 dark:from-violet-900/40 dark:to-violet-800/20 dark:text-violet-400",
};

const icons = {
  abstractAccount:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  archive:
    "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  bell:
    "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  building:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  code: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  coin:
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  copy:
    "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  database:
    "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  flask:
    "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  lightning: "M13 10V3L4 14h7v7l9-11h-7z",
  megaphone:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  refresh:
    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  terminal:
    "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  user:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

const tools = [
  {
    to: "/tools/multisig",
    titleKey: "tools.multisig.title",
    descriptionKey: "tools.multisig.description",
    color: "primary",
    icon: "users",
  },
  {
    to: "/tools/governance",
    titleKey: "tools.governance.title",
    descriptionKey: "tools.governance.description",
    color: "amber",
    icon: "building",
  },
  {
    to: "/contracts/1",
    titleKey: "tools.contractInterface.title",
    descriptionKey: "tools.contractInterface.description",
    color: "violet",
    icon: "terminal",
  },
  {
    to: "/verify-contract",
    titleKey: "tools.verifyContract.title",
    descriptionKey: "tools.verifyContract.description",
    color: "teal",
    icon: "checkCircle",
  },
  {
    to: "/tools/b64",
    titleKey: "tools.converter.title",
    descriptionKey: "tools.converter.description",
    color: "pink",
    icon: "copy",
  },
  {
    to: "/tools/neofs",
    titleKey: "tools.neofs.title",
    descriptionKey: "tools.neofs.description",
    color: "cyan",
    icon: "archive",
  },
  {
    to: "/tools/candidate-profile",
    titleKey: "tools.candidateProfile.title",
    descriptionKey: "tools.candidateProfile.description",
    color: "fuchsia",
    icon: "user",
  },
  {
    to: "/tools/broadcast",
    titleKey: "tools.broadcast.title",
    descriptionKey: "tools.broadcast.description",
    color: "indigo",
    icon: "megaphone",
  },
  {
    to: "/tools/sponsored",
    titleKey: "tools.sponsored.title",
    descriptionKey: "tools.sponsored.description",
    color: "amber",
    icon: "coin",
  },
  {
    to: "/tools/deployer",
    titleKey: "tools.deployer.title",
    descriptionKey: "tools.deployer.description",
    color: "blue",
    icon: "code",
  },
  {
    to: "/tools/factory",
    titleKey: "tools.factory.title",
    descriptionKey: "tools.factory.description",
    color: "violet",
    icon: "flask",
  },
  {
    to: "/tools/abi",
    titleKey: "tools.abi.title",
    descriptionKey: "tools.abi.description",
    color: "pink",
    icon: "code",
  },
  {
    to: "/tools/storage",
    titleKey: "tools.storage.title",
    descriptionKey: "tools.storage.description",
    color: "cyan",
    icon: "database",
  },
  {
    to: "/tools/gas",
    titleKey: "tools.gas.title",
    descriptionKey: "tools.gas.description",
    color: "orange",
    icon: "lightning",
  },
  {
    to: "/tools/mempool",
    titleKey: "tools.mempool.title",
    descriptionKey: "tools.mempool.description",
    color: "emerald",
    icon: "refresh",
  },
  {
    to: "/tools/alerts",
    titleKey: "tools.alerts.title",
    descriptionKey: "tools.alerts.description",
    color: "rose",
    icon: "bell",
  },
  {
    to: "/tools/abstract-account",
    titleKey: "tools.abstractAccount.title",
    descriptionKey: "tools.abstractAccount.description",
    color: "indigo",
    icon: "abstractAccount",
  },
].map((tool) => ({
  ...tool,
  iconClass: `${baseIconClass} ${iconThemes[tool.color]}`,
  iconPath: icons[tool.icon],
}));
</script>
