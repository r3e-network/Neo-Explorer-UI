import { createRouter, createWebHistory } from "vue-router";

// Core pages - lazy loaded with named chunks
const HomePageNew = () => import(/* webpackChunkName: "home" */ "../views/Home/HomePageNew");

// Block module
const BlocksNew = () => import(/* webpackChunkName: "block" */ "../views/Block/BlocksNew");
const BlockDetailNew = () => import(/* webpackChunkName: "block" */ "../views/Block/BlockDetailNew");

// Transaction module
const TransactionsNew = () => import(/* webpackChunkName: "transaction" */ "../views/Transaction/TransactionsNew");
const TxDetailNew = () => import(/* webpackChunkName: "transaction" */ "../views/Transaction/TxDetailNew");

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
        component: HomePageNew,
      },
      {
        path: "/blocks/:page",
        name: "blocks",
        component: BlocksNew,
      },
      {
        path: "/blockinfo/:hash",
        name: "blockinfo",
        component: BlockDetailNew,
      },
      {
        path: "/Transactions/:page",
        name: "transactions",
        component: TransactionsNew,
      },
      {
        path: "/transactionInfo/:txhash",
        name: "transactionInfo",
        component: TxDetailNew,
      },
      {
        path: "/contracts/:page",
        name: "contracts",
        component: ContractsNew,
      },
      {
        path: "/contractinfo/:hash",
        name: "contractinfo",
        component: ContractDetailNew,
      },
      {
        path: "/account/:page",
        name: "Accounts",
        component: AccountsNew,
      },
      {
        path: "/accountprofile/:accountAddress",
        name: "AccountProfile",
        component: AddressDetailNew,
      },
      {
        path: "/tokens/:tab/:page",
        name: "tokens",
        component: TokensNew,
      },
      {
        path: "/NEP17tokeninfo/:hash",
        name: "NEP17tokeninfo",
        component: TokenDetailNew,
      },
      {
        path: "/NFTtokeninfo/:hash",
        name: "NFTtokeninfo",
        component: TokenInfoNep11,
      },
      {
        path: "/candidates/:page",
        name: "Candidates",
        component: CandidatesNew,
      },
      {
        path: "/burn",
        name: "burn",
        component: BurnFee,
      },
      {
        path: "/VerifyContract/:contractHash",
        name: "VerifyContract",
        component: VerifyContract,
      },
      {
        path: "/SourceCode",
        name: "SourceCode",
        component: SourceCode,
      },
      {
        path: "/echarts",
        name: "echarts",
        component: DailyTransaction,
      },
      {
        path: "/api-docs",
        name: "apiDocs",
        component: ApiDocs,
      },
      {
        path: "/NFTinfo/:contractHash/:address/:tokenId",
        name: "NftInfo",
        component: NFTInfoNew,
      },
      {
        path: "search",
        name: "search",
        component: Search,
      },
      {
        path: "/:pathMatch(.*)",
        name: "404",
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

export default router;
