import { createRouter, createWebHistory } from "vue-router";

// Core pages - lazy loaded
const HomePage = () => import("../views/Home/HomePage.vue");

// Block module
const Blocks = () => import("../views/Block/Blocks.vue");
const BlockDetail = () => import("../views/Block/BlockDetail.vue");

// Transaction module
const Transactions = () => import("../views/Transaction/Transactions.vue");
const TxDetail = () => import("../views/Transaction/TxDetail.vue");
const TxExecutionTrace = () => import("../views/Transaction/TxExecutionTrace.vue");

// Token module
const Tokens = () => import("../views/Token/Tokens.vue");
const TokenDetail = () => import("../views/Token/TokenDetail.vue");
const TokenInfoNep11 = () => import("../views/Token/TokenInfonNep11.vue");
const NFTInfo = () => import("../views/Token/NFTInfo.vue");

// Contract module
const Contracts = () => import("../views/Contract/Contracts.vue");
const ContractDetail = () => import("../views/Contract/ContractDetail.vue");
const VerifyContract = () => import("../views/Contract/VerifyContract.vue");
const SourceCode = () => import("../views/Contract/SourceCode.vue");

// Account module
const Accounts = () => import("../views/Account/Accounts.vue");
const AddressDetail = () => import("../views/Account/AddressDetail.vue");

// Other pages
const Candidates = () => import("../views/Candidate/Candidates.vue");
const BurnFee = () => import("../views/BurnGas/BurnFee.vue");
const DailyTransaction = () => import("../views/BurnGas/DailyTransaction.vue");
const ApiDocs = () => import("../views/Developer/ApiDocs.vue");

// New placeholder pages
const GasTracker = () => import("../views/GasTracker/GasTracker.vue");
const AdvancedSearch = () => import("../views/Search/AdvancedSearch.vue");

// Error pages
const Search = () => import("../views/NotFound/SearchNotFound.vue");
const PageNotFound = () => import("../views/NotFound/PageNotFound.vue");

import MainLayout from "../components/layout/MainLayout.vue";

const routes = [
  {
    path: "/",
    redirect: "homepage",
    component: MainLayout,
    children: [
      {
        path: "/homepage",
        name: "homepage",
        meta: { title: "Neo Explorer" },
        component: HomePage,
      },
      {
        path: "/blocks/:page",
        name: "blocks",
        meta: { title: "Blocks" },
        component: Blocks,
      },
      {
        path: "/block-info/:hash",
        name: "blockDetail",
        meta: { title: "Block Detail" },
        component: BlockDetail,
      },
      {
        path: "/transactions/:page",
        name: "transactions",
        meta: { title: "Transactions" },
        component: Transactions,
      },
      {
        path: "/transaction-info/:txhash",
        name: "transactionDetail",
        meta: { title: "Transaction Detail" },
        component: TxDetail,
      },
      {
        path: "/contracts/:page",
        name: "contracts",
        meta: { title: "Contracts" },
        component: Contracts,
      },
      {
        path: "/contract-info/:hash",
        name: "contractDetail",
        meta: { title: "Contract Detail" },
        component: ContractDetail,
      },
      {
        path: "/account/:page",
        name: "accounts",
        meta: { title: "Accounts" },
        component: Accounts,
      },
      {
        path: "/account-profile/:accountAddress",
        name: "accountProfile",
        meta: { title: "Address Detail" },
        component: AddressDetail,
      },
      {
        path: "/tokens/:tab/:page",
        name: "tokens",
        meta: { title: "Tokens" },
        component: Tokens,
      },
      {
        path: "/nep17-token-info/:hash",
        name: "nep17TokenDetail",
        meta: { title: "NEP-17 Token" },
        component: TokenDetail,
      },
      {
        path: "/nft-token-info/:hash",
        name: "nep11TokenDetail",
        meta: { title: "NFT Collection" },
        component: TokenInfoNep11,
      },
      {
        path: "/candidates/:page",
        name: "candidates",
        meta: { title: "Consensus Nodes" },
        component: Candidates,
      },
      {
        path: "/burn",
        name: "burn",
        meta: { title: "Burned GAS" },
        component: BurnFee,
      },
      {
        path: "/verify-contract/:contractHash",
        name: "verifyContract",
        meta: { title: "Verify Contract" },
        component: VerifyContract,
      },
      {
        path: "/source-code",
        name: "sourceCode",
        meta: { title: "Source Code" },
        component: SourceCode,
      },
      {
        path: "/echarts",
        name: "charts",
        meta: { title: "Charts & Statistics" },
        component: DailyTransaction,
      },
      {
        path: "/api-docs",
        name: "apiDocs",
        meta: { title: "API Documentation" },
        component: ApiDocs,
      },
      {
        path: "/nft-info/:contractHash/:address/:tokenId",
        name: "nftDetail",
        meta: { title: "NFT Detail" },
        component: NFTInfo,
      },
      {
        path: "/gas-tracker",
        name: "gasTracker",
        meta: { title: "Gas Tracker" },
        component: GasTracker,
      },
      {
        path: "/advanced-search",
        name: "advancedSearch",
        meta: { title: "Advanced Search" },
        component: AdvancedSearch,
      },
      {
        path: "/tx/:txhash/trace",
        name: "txExecutionTrace",
        meta: { title: "Execution Trace" },
        component: TxExecutionTrace,
      },
      {
        path: "search",
        name: "search",
        meta: { title: "Search Results" },
        component: Search,
      },
      {
        path: "/:pathMatch(.*)*",
        name: "notFound",
        meta: { title: "Page Not Found" },
        component: PageNotFound,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  linkActiveClass: "active",
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// Reset error state on navigation
router.beforeEach(() => {
  // Allow navigation to proceed; clears any stale error context
});

// Catch lazy-load and navigation failures
router.onError((error) => {
  if (import.meta.env.DEV) {
    console.error("Router error:", error);
  }
});

// Dynamic document title from route meta
router.afterEach((to) => {
  const title = to.meta?.title;
  document.title = title ? `${title} | Neo Explorer` : "Neo Explorer";
});

export default router;
