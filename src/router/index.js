import { createRouter, createWebHistory } from "vue-router";

// New Etherscan-style components
const HomePageNew = () => import("../views/Home/HomePageNew");
const BlocksNew = () => import("../views/Block/BlocksNew");
const BlockDetailNew = () => import("../views/Block/BlockDetailNew");
const TransactionsNew = () => import("../views/Transaction/TransactionsNew");
const TxDetailNew = () => import("../views/Transaction/TxDetailNew");
const TokensNew = () => import("../views/Token/TokensNew");
const TokenDetailNew = () => import("../views/Token/TokenDetailNew");
const ContractsNew = () => import("../views/Contract/ContractsNew");
const ContractDetailNew = () => import("../views/Contract/ContractDetailNew");
const AccountsNew = () => import("../views/Account/AccountsNew");
const AddressDetailNew = () => import("../views/Account/AddressDetailNew");
const CandidatesNew = () => import("../views/Candidate/CandidatesNew");

// Legacy components (still in use)
const TokenInfoNep11 = () => import("../views/Token/TokenInfonNep11");
const NFTInfoNew = () => import("../views/Token/NFTInfoNew");
const VerifyContract = () => import("../views/Contract/VerifyContract");
const Search = () => import("../views/NotFound/SearchNotFound");
const PageNotFound = () => import("../views/NotFound/PageNotFound");
const BurnFee = () => import("../views/BurnGas/BurnFee");
const importEcharts = () => import("../views/BurnGas/DailyTransaction");
const SourceCode = () => import("../views/Contract/SourceCode");

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
        meta: { showSearch: false, HomePage: true, showBot: true, showNet: true }
      },
      {
        path: "/blocks/:page",
        name: "blocks",
        component: BlocksNew,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/blockinfo/:hash",
        name: "blockinfo",
        component: BlockDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "/Transactions/:page",
        name: "transactions",
        component: TransactionsNew,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/transactionInfo/:txhash",
        name: "transactionInfo",
        component: TxDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "/contracts/:page",
        name: "contracts",
        component: ContractsNew,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/contractinfo/:hash",
        name: "contractinfo",
        component: ContractDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "/account/:page",
        name: "Accounts",
        component: AccountsNew,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/accountprofile/:accountAddress",
        name: "AccountProfile",
        component: AddressDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "/tokens/:tab/:page",
        name: "tokens",
        component: TokensNew,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/NEP17tokeninfo/:hash",
        name: "NEP17tokeninfo",
        component: TokenDetailNew,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "/NFTtokeninfo/:hash",
        name: "NFTtokeninfo",
        component: TokenInfoNep11,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "/candidates/:page",
        name: "Candidates",
        component: CandidatesNew,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/burn",
        name: "burn",
        component: BurnFee,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/VerifyContract/:contractHash",
        name: "VerifyContract",
        component: VerifyContract,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/SourceCode",
        name: "SourceCode",
        component: SourceCode,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/echarts",
        name: "echarts",
        component: importEcharts,
        meta: { showSearch: true, showBot: true, showNet: true }
      },
      {
        path: "/NFTinfo/:contractHash/:address/:tokenId",
        name: "NftInfo",
        component: NFTInfoNew,
        meta: { showSearch: true, showBot: true, showNet: false }
      },
      {
        path: "search",
        name: "search",
        component: Search,
        meta: { showSearch: false, showBot: false, showNet: true }
      },
      {
        path: "/:pathMatch(.*)",
        name: "404",
        component: PageNotFound,
        meta: { showSearch: false, showBot: false, showNet: true }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  linkActiveClass: "active",
  routes
});

export default router;
