import { createRouter, createWebHistory } from "vue-router";

// Core pages - lazy loaded with named chunks
const HomePageNew = () => import(/* webpackChunkName: "home" */ "../views/Home/HomePageNew");

// Block module
const BlocksNew = () => import(/* webpackChunkName: "block" */ "../views/Block/BlocksNew");
const BlockDetailNew = () => import(/* webpackChunkName: "block" */ "../views/Block/BlockDetailNew");

// Transaction module
const TransactionsNew = () => import(/* webpackChunkName: "transaction" */ "../views/Transaction/TransactionsNew");
const TxDetailNew = () => import(/* webpackChunkName: "transaction" */ "../views/Transaction/TxDetailNew");
const TxExecutionTrace = () => import(/* webpackChunkName: "transaction" */ "../views/Transaction/TxExecutionTrace");

// Token module
const TokensNew = () => import(/* webpackChunkName: "token" */ "../views/Token/TokensNew");
const TokenDetailNew = () => import(/* webpackChunkName: "token" */ "../views/Token/TokenDetailNew");
const TokenInfoNep11 = () => import(/* webpackChunkName: "token" */ "../views/Token/TokenInfonNep11");
const NFTInfoNew = () => import(/* webpackChunkName: "token" */ "../views/Token/NFTInfoNew");

// Contract module
const ContractsNew = () => import(/* webpackChunkName: "contract" */ "../views/Contract/ContractsNew");
const ContractDetailNew = () => import(/* webpackChunkName: "contract" */ "../views/Contract/ContractDetailNew");
const VerifyContract = () => import(/* webpackChunkName: "contract" */ "../views/Contract/VerifyContract");
const SourceCode = () => import(/* webpackChunkName: "contract" */ "../views/Contract/SourceCode");

// Account module
const AccountsNew = () => import(/* webpackChunkName: "account" */ "../views/Account/AccountsNew");
const AddressDetailNew = () => import(/* webpackChunkName: "account" */ "../views/Account/AddressDetailNew");

// Other pages
const CandidatesNew = () => import(/* webpackChunkName: "candidate" */ "../views/Candidate/CandidatesNew");
const BurnFee = () => import(/* webpackChunkName: "burn" */ "../views/BurnGas/BurnFee");
const DailyTransaction = () => import(/* webpackChunkName: "charts" */ "../views/BurnGas/DailyTransaction");
const ApiDocs = () => import(/* webpackChunkName: "developer" */ "../views/Developer/ApiDocs");

// New placeholder pages
const GasTracker = () => import(/* webpackChunkName: "gas-tracker" */ "../views/GasTracker/GasTracker");
const AdvancedSearch = () => import(/* webpackChunkName: "search" */ "../views/Search/AdvancedSearch");

// Error pages
const Search = () => import(/* webpackChunkName: "error" */ "../views/NotFound/SearchNotFound");
const PageNotFound = () => import(/* webpackChunkName: "error" */ "../views/NotFound/PageNotFound");

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
        component: HomePageNew,
      },
      {
        path: "/blocks/:page",
        name: "blocks",
        meta: { title: "Blocks" },
        component: BlocksNew,
      },
      {
        path: "/block-info/:hash",
        name: "blockDetail",
        meta: { title: "Block Detail" },
        component: BlockDetailNew,
      },
      {
        path: "/transactions/:page",
        name: "transactions",
        meta: { title: "Transactions" },
        component: TransactionsNew,
      },
      {
        path: "/transaction-info/:txhash",
        name: "transactionDetail",
        meta: { title: "Transaction Detail" },
        component: TxDetailNew,
      },
      {
        path: "/contracts/:page",
        name: "contracts",
        meta: { title: "Contracts" },
        component: ContractsNew,
      },
      {
        path: "/contract-info/:hash",
        name: "contractDetail",
        meta: { title: "Contract Detail" },
        component: ContractDetailNew,
      },
      {
        path: "/account/:page",
        name: "accounts",
        meta: { title: "Accounts" },
        component: AccountsNew,
      },
      {
        path: "/account-profile/:accountAddress",
        name: "accountProfile",
        meta: { title: "Address Detail" },
        component: AddressDetailNew,
      },
      {
        path: "/tokens/:tab/:page",
        name: "tokens",
        meta: { title: "Tokens" },
        component: TokensNew,
      },
      {
        path: "/nep17-token-info/:hash",
        name: "nep17TokenDetail",
        meta: { title: "NEP-17 Token" },
        component: TokenDetailNew,
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
        component: CandidatesNew,
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
        component: NFTInfoNew,
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
        path: "/:pathMatch(.*)",
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

// Dynamic document title from route meta
router.afterEach((to) => {
  const title = to.meta?.title;
  document.title = title ? `${title} | Neo Explorer` : "Neo Explorer";
});

export default router;
