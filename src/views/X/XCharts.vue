<template>
  <div class="x-charts-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb :items="breadcrumbs" />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-icon-orange">
            <svg class="text-warning h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ tf("pageTitles.xCharts", "Neo X Charts") }}</h1>
            <p class="page-subtitle">
              {{ tf("neoX.chartsSubtitle", "Network activity and resource statistics for Neo X") }}
            </p>
          </div>
        </div>
      </PageHero>

      <!-- Chart Sections -->
      <div
        v-for="(section, index) in sections"
        :key="section.key"
        class="animate-page-enter"
        :class="index === 0 ? 'animate-page-enter-delay-1' : ''"
      >
        <h2 class="text-high mb-3 mt-6 text-base font-semibold">{{ section.title }}</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <XStatChart
            v-for="chart in section.charts"
            :key="chart.lineId"
            :line-id="chart.lineId"
            :title="chart.title"
            :subtitle="chart.subtitle"
            :value-suffix="chart.valueSuffix || ''"
            :decimals="chart.decimals ?? 2"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import XStatChart from "./components/XStatChart.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const breadcrumbs = computed(() => [
  { label: tf("breadcrumb.home", "Home"), to: "/homepage" },
  { label: tf("neoX.chainName", "Neo X"), to: "/x" },
  { label: tf("neoX.chartsBreadcrumb", "Charts") },
]);

const sections = computed(() => [
  {
    key: "transactions",
    title: tf("neoX.chartSectionTransactions", "Transactions"),
    charts: [
      {
        lineId: "newTxns",
        title: tf("neoX.chartNewTxns", "Daily Transactions"),
        subtitle: tf("neoX.chartNewTxnsSubtitle", "Transactions per day on Neo X"),
        decimals: 0,
      },
      {
        lineId: "txnsFee",
        title: tf("neoX.chartTxnsFee", "Transaction Fees"),
        subtitle: tf("neoX.chartTxnsFeeSubtitle", "Total fees paid per day in GAS"),
        valueSuffix: " GAS",
        decimals: 2,
      },
      {
        lineId: "averageTxnFee",
        title: tf("neoX.chartAverageTxnFee", "Average Txn Fee"),
        subtitle: tf("neoX.chartAverageTxnFeeSubtitle", "Average fee per transaction in GAS"),
        valueSuffix: " GAS",
        decimals: 6,
      },
      {
        lineId: "txnsSuccessRate",
        title: tf("neoX.chartTxnsSuccessRate", "Success Rate"),
        subtitle: tf("neoX.chartTxnsSuccessRateSubtitle", "Share of successful transactions per day"),
        valueSuffix: "%",
        decimals: 2,
      },
    ],
  },
  {
    key: "gas",
    title: tf("neoX.chartSectionGas", "Gas"),
    charts: [
      {
        lineId: "averageGasPrice",
        title: tf("neoX.chartAverageGasPrice", "Average Gas Price"),
        subtitle: tf("neoX.chartAverageGasPriceSubtitle", "Average gas price per day"),
        valueSuffix: " Gwei",
        decimals: 2,
      },
      {
        lineId: "averageGasUsed",
        title: tf("neoX.chartAverageGasUsed", "Average Gas Used"),
        subtitle: tf("neoX.chartAverageGasUsedSubtitle", "Average gas used per block"),
        decimals: 0,
      },
      {
        lineId: "gasUsedGrowth",
        title: tf("neoX.chartGasUsedGrowth", "Total Gas Used"),
        subtitle: tf("neoX.chartGasUsedGrowthSubtitle", "Cumulative gas used on Neo X"),
        decimals: 0,
      },
      {
        lineId: "networkUtilization",
        title: tf("neoX.chartNetworkUtilization", "Network Utilization"),
        subtitle: tf("neoX.chartNetworkUtilizationSubtitle", "Share of gas target used per day"),
        valueSuffix: "%",
        decimals: 2,
      },
    ],
  },
  {
    key: "accounts",
    title: tf("neoX.chartSectionAccounts", "Accounts"),
    charts: [
      {
        lineId: "activeAccounts",
        title: tf("neoX.chartActiveAccounts", "Active Accounts"),
        subtitle: tf("neoX.chartActiveAccountsSubtitle", "Accounts transacting per day"),
        decimals: 0,
      },
      {
        lineId: "accountsGrowth",
        title: tf("neoX.chartAccountsGrowth", "Total Accounts"),
        subtitle: tf("neoX.chartAccountsGrowthSubtitle", "Cumulative accounts on Neo X"),
        decimals: 0,
      },
      {
        lineId: "newAccounts",
        title: tf("neoX.chartNewAccounts", "New Accounts"),
        subtitle: tf("neoX.chartNewAccountsSubtitle", "Accounts created per day"),
        decimals: 0,
      },
    ],
  },
  {
    key: "contracts",
    title: tf("neoX.chartSectionContracts", "Contracts"),
    charts: [
      {
        lineId: "newVerifiedContracts",
        title: tf("neoX.chartNewVerifiedContracts", "New Verified Contracts"),
        subtitle: tf("neoX.chartNewVerifiedContractsSubtitle", "Contracts verified per day"),
        decimals: 0,
      },
      {
        lineId: "contractsGrowth",
        title: tf("neoX.chartContractsGrowth", "Total Contracts"),
        subtitle: tf("neoX.chartContractsGrowthSubtitle", "Cumulative contracts deployed on Neo X"),
        decimals: 0,
      },
    ],
  },
  {
    key: "blocks",
    title: tf("neoX.chartSectionBlocks", "Blocks"),
    charts: [
      {
        lineId: "newBlocks",
        title: tf("neoX.chartNewBlocks", "New Blocks"),
        subtitle: tf("neoX.chartNewBlocksSubtitle", "Blocks produced per day"),
        decimals: 0,
      },
      {
        lineId: "averageBlockSize",
        title: tf("neoX.chartAverageBlockSize", "Average Block Size"),
        subtitle: tf("neoX.chartAverageBlockSizeSubtitle", "Average block size per day in bytes"),
        valueSuffix: " bytes",
        decimals: 0,
      },
    ],
  },
]);
</script>
