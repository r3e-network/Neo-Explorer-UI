import { createRouter, createWebHistory } from "vue-router";

/**
 * Wraps dynamic imports with ChunkLoadError retry.
 * On chunk load failure (stale deployment), reloads the page once.
 */
function lazyLoad(importFn) {
  return () =>
    importFn().catch((error) => {
      if (
        error.name === "ChunkLoadError" ||
        error.message?.includes("Failed to fetch dynamically imported module") ||
        error.message?.includes("Loading chunk")
      ) {
        const reloadKey = "chunk-reload";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
          return; // unreachable, but satisfies linter
        }
        sessionStorage.removeItem(reloadKey);
      }
      throw error;
    });
}

// Core pages - lazy loaded
const HomePage = lazyLoad(() => import("../views/Home/HomePage.vue"));

// Block module
const Blocks = lazyLoad(() => import("../views/Block/Blocks.vue"));
const BlockDetail = lazyLoad(() => import("../views/Block/BlockDetail.vue"));

// Transaction module
const Transactions = lazyLoad(() => import("../views/Transaction/Transactions.vue"));
const TxDetail = lazyLoad(() => import("../views/Transaction/TxDetail.vue"));
const TxExecutionTrace = lazyLoad(() => import("../views/Transaction/TxExecutionTrace.vue"));

// Token module
const Tokens = lazyLoad(() => import("../views/Token/Tokens.vue"));
const TokenDetail = lazyLoad(() => import("../views/Token/TokenDetail.vue"));
const TokenInfoNep11 = lazyLoad(() => import("../views/Token/TokenInfoNep11.vue"));
const NFTInfo = lazyLoad(() => import("../views/Token/NFTInfo.vue"));

// Contract module
const Contracts = lazyLoad(() => import("../views/Contract/Contracts.vue"));
const ContractDetail = lazyLoad(() => import("../views/Contract/ContractDetail.vue"));
const VerifyContract = lazyLoad(() => import("../views/Contract/VerifyContract.vue"));
const SourceCode = lazyLoad(() => import("../views/Contract/SourceCode.vue"));

// Account module
const Accounts = lazyLoad(() => import("../views/Account/Accounts.vue"));
const AddressDetail = lazyLoad(() => import("../views/Account/AddressDetail.vue"));

// Other pages
const Candidates = lazyLoad(() => import("../views/Candidate/Candidates.vue"));
const BurnFee = lazyLoad(() => import("../views/BurnGas/BurnFee.vue"));
const DailyTransaction = lazyLoad(() => import("../views/BurnGas/DailyTransaction.vue"));
const ApiDocs = lazyLoad(() => import("../views/Developer/ApiDocs.vue"));

// New placeholder pages
const GasTracker = lazyLoad(() => import("../views/GasTracker/GasTracker.vue"));
const AdvancedSearch = lazyLoad(() => import("../views/Search/AdvancedSearch.vue"));

// Error pages
const Search = lazyLoad(() => import("../views/NotFound/SearchNotFound.vue"));
const PageNotFound = lazyLoad(() => import("../views/NotFound/PageNotFound.vue"));

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
        path: "/blocks",
        redirect: "/blocks/1",
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
        path: "/transactions",
        redirect: "/transactions/1",
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
        path: "/contracts",
        redirect: "/contracts/1",
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
        path: "/verify-contract/:contractHash?",
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

// Catch lazy-load and navigation failures
router.onError((error) => {
  if (import.meta.env.DEV) {
    console.error("Router error:", error);
  }
});

// Clear chunk reload flag on successful navigation & set document title
router.afterEach((to) => {
  sessionStorage.removeItem("chunk-reload");
  const title = to.meta?.title;
  document.title = title ? `${title} | Neo Explorer` : "Neo Explorer";
});

export default router;
