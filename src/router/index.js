import { createRouter, createWebHistory } from "vue-router";

// Core pages - lazy loaded with named chunks
const HomePageNew = () =>
  import(/* webpackChunkName: "home" */ "../views/Home/HomePageNew");

// Block module
const BlocksNew = () =>
  import(/* webpackChunkName: "block" */ "../views/Block/BlocksNew");
const BlockDetailNew = () =>
  import(/* webpackChunkName: "block" */ "../views/Block/BlockDetailNew");

// Transaction module
const TransactionsNew = () =>
  import(
    /* webpackChunkName: "transaction" */ "../views/Transaction/TransactionsNew"
  );
const TxDetailNew = () =>
  import(
    /* webpackChunkName: "transaction" */ "../views/Transaction/TxDetailNew"
  );

// Token module
const TokensNew = () =>
  import(/* webpackChunkName: "token" */ "../views/Token/TokensNew");
const TokenDetailNew = () =>
  import(/* webpackChunkName: "token" */ "../views/Token/TokenDetailNew");
const TokenInfoNep11 = () =>
  import(/* webpackChunkName: "token" */ "../views/Token/TokenInfonNep11");
const NFTInfoNew = () =>
  import(/* webpackChunkName: "token" */ "../views/Token/NFTInfoNew");

// Contract module
const ContractsNew = () =>
  import(/* webpackChunkName: "contract" */ "../views/Contract/ContractsNew");
const ContractDetailNew = () =>
  import(
    /* webpackChunkName: "contract" */ "../views/Contract/ContractDetailNew"
  );
const VerifyContract = () =>
  import(/* webpackChunkName: "contract" */ "../views/Contract/VerifyContract");
const SourceCode = () =>
  import(/* webpackChunkName: "contract" */ "../views/Contract/SourceCode");

// Account module
const AccountsNew = () =>
  import(/* webpackChunkName: "account" */ "../views/Account/AccountsNew");
const AddressDetailNew = () =>
  import(/* webpackChunkName: "account" */ "../views/Account/AddressDetailNew");

// Other pages
const CandidatesNew = () =>
  import(
    /* webpackChunkName: "candidate" */ "../views/Candidate/CandidatesNew"
  );
const BurnFee = () =>
  import(/* webpackChunkName: "burn" */ "../views/BurnGas/BurnFee");
const importEcharts = () =>
  import(/* webpackChunkName: "charts" */ "../views/BurnGas/DailyTransaction");

// Error pages
const Search = () =>
  import(/* webpackChunkName: "error" */ "../views/NotFound/SearchNotFound");
const PageNotFound = () =>
  import(/* webpackChunkName: "error" */ "../views/NotFound/PageNotFound");

import AuthLayout from "../layout/AuthLayout";

const routes = [
  {
    path: "/",
    redirect: "homepage",
    component: AuthLayout,
    children: [
      {
        path: "/homepage",
        name: "homepage",
        component: HomePageNew,
        meta: {
          showSearch: false,
          HomePage: true,
          showBot: true,
          showNet: true,
        },
      },
      {
        path: "/blocks/:page",
        name: "blocks",
        component: BlocksNew,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/blockinfo/:hash",
        name: "blockinfo",
        component: BlockDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "/Transactions/:page",
        name: "transactions",
        component: TransactionsNew,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/transactionInfo/:txhash",
        name: "transactionInfo",
        component: TxDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "/contracts/:page",
        name: "contracts",
        component: ContractsNew,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/contractinfo/:hash",
        name: "contractinfo",
        component: ContractDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "/account/:page",
        name: "Accounts",
        component: AccountsNew,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/accountprofile/:accountAddress",
        name: "AccountProfile",
        component: AddressDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "/tokens/:tab/:page",
        name: "tokens",
        component: TokensNew,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/NEP17tokeninfo/:hash",
        name: "NEP17tokeninfo",
        component: TokenDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "/NFTtokeninfo/:hash",
        name: "NFTtokeninfo",
        component: TokenInfoNep11,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "/candidates/:page",
        name: "Candidates",
        component: CandidatesNew,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/burn",
        name: "burn",
        component: BurnFee,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/VerifyContract/:contractHash",
        name: "VerifyContract",
        component: VerifyContract,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/SourceCode",
        name: "SourceCode",
        component: SourceCode,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/echarts",
        name: "echarts",
        component: importEcharts,
        meta: { showSearch: true, showBot: true, showNet: true },
      },
      {
        path: "/NFTinfo/:contractHash/:address/:tokenId",
        name: "NftInfo",
        component: NFTInfoNew,
        meta: { showSearch: true, showBot: true, showNet: false },
      },
      {
        path: "search",
        name: "search",
        component: Search,
        meta: { showSearch: false, showBot: false, showNet: true },
      },
      {
        path: "/:pathMatch(.*)",
        name: "404",
        component: PageNotFound,
        meta: { showSearch: false, showBot: false, showNet: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  linkActiveClass: "active",
  routes,
});

export default router;
