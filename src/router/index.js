import { createRouter, createWebHistory } from "vue-router";
import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_TARGET_KEY, CHUNK_RELOAD_QUERY_KEY, isChunkLoadError, triggerChunkReload } from "@/utils/chunkReload";

let pendingRoutePath = "/homepage";

/**
 * Wraps dynamic imports with ChunkLoadError retry.
 * On chunk load failure (stale deployment), reloads the page once.
 */
function lazyLoad(importFn) {
  return () =>
    importFn().catch((error) => {
      if (isChunkLoadError(error)) {
        const target = pendingRoutePath || sessionStorage.getItem(CHUNK_RELOAD_TARGET_KEY) || "/homepage";
        if (triggerChunkReload(target)) {
          return new Promise(() => {});
        }
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
const Treasury = lazyLoad(() => import("../views/Treasury/Treasury.vue"));

// Other pages
const Candidates = lazyLoad(() => import("../views/Candidate/Candidates.vue"));
const BurnFee = lazyLoad(() => import("../views/BurnGas/BurnFee.vue"));
const ChartsPage = lazyLoad(() => import("../views/Charts/ChartsPage.vue"));
const ApiDocs = lazyLoad(() => import("../views/Developer/ApiDocs.vue"));

// New placeholder pages
const GasTracker = lazyLoad(() => import("../views/GasTracker/GasTracker.vue"));
const NetworkStatus = lazyLoad(() => import("../views/NetworkStatus/NetworkStatus.vue"));
const AdvancedSearch = lazyLoad(() => import("../views/Search/AdvancedSearch.vue"));
const Governance = lazyLoad(() => import("../views/Governance/Governance.vue"));
const ChatPage = lazyLoad(() => import("../views/Chat/ChatPage.vue"));

// Error pages
const Search = lazyLoad(() => import("../views/NotFound/SearchNotFound.vue"));
const PageNotFound = lazyLoad(() => import("../views/NotFound/PageNotFound.vue"));

import MainLayout from "../components/layout/MainLayout.vue";

const NNS = lazyLoad(() => import("../views/NNS/NNS.vue"));
const MatrixDomain = lazyLoad(() => import("../views/NNS/MatrixDomain.vue"));
const ToolsIndex = lazyLoad(() => import("../views/Tools/ToolsIndex.vue"));
const MultiSigTool = lazyLoad(() => import("../views/Tools/MultiSigTool.vue"));
const GovernanceTool = lazyLoad(() => import("../views/Tools/GovernanceTool.vue"));
const GovernanceProposalDetail = lazyLoad(() => import("../views/Tools/GovernanceProposalDetail.vue"));
const FormatConverterTool = lazyLoad(() => import("../views/Tools/FormatConverterTool.vue"));
const NeoFSTool = lazyLoad(() => import("../views/Tools/NeoFSTool.vue"));
const CandidateProfileTool = lazyLoad(() => import("../views/Tools/CandidateProfileTool.vue"));
const BroadcastMessageTool = lazyLoad(() => import("../views/Tools/BroadcastMessageTool.vue"));
const SponsoredTool = lazyLoad(() => import("../views/Tools/SponsoredTool.vue"));
const ContractDeployerTool = lazyLoad(() => import("../views/Tools/ContractDeployerTool.vue"));
const ContractFactoryTool = lazyLoad(() => import("../views/Tools/ContractFactoryTool.vue"));
const AbiEncoderTool = lazyLoad(() => import("../views/Tools/AbiEncoderTool.vue"));
const StorageInspectorTool = lazyLoad(() => import("../views/Tools/StorageInspectorTool.vue"));
const GasEstimatorTool = lazyLoad(() => import("../views/Tools/GasEstimatorTool.vue"));
const MempoolTool = lazyLoad(() => import("../views/Tools/MempoolTool.vue"));
const NetworkAlertsTool = lazyLoad(() => import("../views/Tools/NetworkAlertsTool.vue"));
const AbstractAccountTool = lazyLoad(() => import("../views/Tools/AbstractAccountTool.vue"));

const routes = [
  {
    path: "/",
    redirect: "homepage",
    component: MainLayout,
    children: [
      {
        path: "/homepage",
        name: "homepage",
        meta: { titleKey: "pageTitles.homepage" },
        component: HomePage,
      },
      {
        path: "/nns",
        name: "nns",
        meta: { titleKey: "pageTitles.nns" },
        component: NNS,
      },
      {
        path: "/matrix",
        name: "matrix",
        meta: { titleKey: "pageTitles.matrix" },
        component: MatrixDomain,
      },
      {
        path: "/tools",
        name: "tools",
        meta: { titleKey: "pageTitles.tools" },
        component: ToolsIndex,
      },
      // Convenience top-level aliases for the most-typed tool URLs.
      // Users frequently bookmark /multisig or /sponsored without the
      // /tools/ prefix; redirect rather than 404.
      { path: "/multisig", redirect: "/tools/multisig" },
      { path: "/multi-sig", redirect: "/tools/multisig" },
      { path: "/sponsored", redirect: "/tools/sponsored" },
      { path: "/sponsored-transactions", redirect: "/tools/sponsored" },
      { path: "/neofs", redirect: "/tools/neofs" },
      { path: "/mempool", redirect: "/tools/mempool" },
      { path: "/burn-fee", redirect: "/burn" },
      { path: "/api", redirect: "/api-docs" },
      { path: "/docs", redirect: "/api-docs" },
      // Singular plain-English aliases for top-level pages.
      { path: "/home", redirect: "/homepage" },
      { path: "/index", redirect: "/homepage" },
      { path: "/verify", redirect: "/verify-contract" },
      // Tool sub-pages addressed without the /tools/ prefix.
      { path: "/broadcast", redirect: "/tools/broadcast" },
      { path: "/deployer", redirect: "/tools/deployer" },
      { path: "/factory", redirect: "/tools/factory" },
      { path: "/abi", redirect: "/tools/abi" },
      { path: "/storage", redirect: "/tools/storage" },
      { path: "/alerts", redirect: "/tools/alerts" },
      { path: "/abstract-account", redirect: "/tools/abstract-account" },
      { path: "/candidate-profile", redirect: "/tools/candidate-profile" },
      // Singular forms of plural canonical routes.
      { path: "/candidate", redirect: "/candidates/1" },
      { path: "/contract", redirect: "/contracts/1" },
      {
        path: "/tools/multisig",
        name: "multisig",
        meta: { titleKey: "pageTitles.multisig" },
        component: MultiSigTool,
      },
      {
        path: "/tools/governance",
        name: "governanceTool",
        meta: { titleKey: "pageTitles.councilGovernance" },
        component: GovernanceTool,
      },
      {
        path: "/tools/governance/:id",
        name: "governanceProposalDetail",
        meta: { titleKey: "pageTitles.councilProposalDetail" },
        component: GovernanceProposalDetail,
      },
      {
        path: "/tools/b64",
        name: "formatConverter",
        meta: { titleKey: "pageTitles.formatConverter" },
        component: FormatConverterTool,
      },
      {
        path: "/tools/neofs",
        name: "neofsGateway",
        meta: { titleKey: "pageTitles.neofs" },
        component: NeoFSTool,
      },
      {
        path: "/tools/candidate-profile",
        name: "candidateProfileManager",
        meta: { titleKey: "pageTitles.candidateProfile" },
        component: CandidateProfileTool,
      },
      {
        path: "/tools/broadcast",
        name: "broadcastMessage",
        meta: { titleKey: "pageTitles.onChainMessage" },
        component: BroadcastMessageTool,
      },
      {
        path: "/tools/sponsored",
        name: "sponsoredTransactions",
        meta: { titleKey: "pageTitles.sponsored" },
        component: SponsoredTool,
      },
      {
        path: "/tools/deployer",
        name: "contractDeployer",
        meta: { titleKey: "pageTitles.contractDeployer" },
        component: ContractDeployerTool,
      },
      {
        path: "/tools/factory",
        name: "contractFactory",
        meta: { titleKey: "pageTitles.contractFactory" },
        component: ContractFactoryTool,
      },
      {
        path: "/tools/abi",
        name: "abiEncoder",
        meta: { titleKey: "pageTitles.abiEncoder" },
        component: AbiEncoderTool,
      },
      {
        path: "/tools/storage",
        name: "storageInspector",
        meta: { titleKey: "pageTitles.storageInspector" },
        component: StorageInspectorTool,
      },
      {
        path: "/tools/gas",
        name: "gasEstimator",
        meta: { titleKey: "pageTitles.gasEstimator" },
        component: GasEstimatorTool,
      },
      {
        path: "/tools/mempool",
        name: "mempoolTool",
        meta: { titleKey: "pageTitles.mempool" },
        component: MempoolTool,
      },
      {
        path: "/tools/alerts",
        name: "networkAlerts",
        meta: { titleKey: "pageTitles.networkAlerts" },
        component: NetworkAlertsTool,
      },
      {
        path: "/tools/abstract-account",
        name: "abstractAccountDeployer",
        meta: { titleKey: "pageTitles.abstractAccount" },
        component: AbstractAccountTool,
      },
      {
        path: "/blocks",
        redirect: "/blocks/1",
      },
      {
        // Singular Etherscan-style guess.
        path: "/block",
        redirect: "/blocks/1",
      },
      {
        path: "/blocks/:page",
        name: "blocks",
        meta: { titleKey: "pageTitles.blocks" },
        component: Blocks,
      },
      {
        path: "/block-info/:hash",
        name: "blockDetail",
        meta: { titleKey: "pageTitles.blockDetail" },
        component: BlockDetail,
      },
      {
        path: "/transactions",
        redirect: "/transactions/1",
      },
      {
        // Etherscan-style guesses.
        path: "/transaction",
        redirect: "/transactions/1",
      },
      {
        path: "/tx",
        redirect: "/transactions/1",
      },
      {
        path: "/transactions/:page",
        name: "transactions",
        meta: { titleKey: "pageTitles.transactions" },
        component: Transactions,
      },
      {
        path: "/transaction-info/:txhash",
        name: "transactionDetail",
        meta: { titleKey: "pageTitles.transactionDetail" },
        component: TxDetail,
      },
      {
        path: "/contracts",
        redirect: "/contracts/1",
      },
      {
        path: "/contracts/:page",
        name: "contracts",
        meta: { titleKey: "pageTitles.contracts" },
        component: Contracts,
      },
      {
        path: "/contract-info/:hash",
        name: "contractDetail",
        meta: { titleKey: "pageTitles.contractDetail" },
        component: ContractDetail,
      },
      {
        path: "/account/:page",
        name: "accounts",
        meta: { titleKey: "pageTitles.accounts" },
        component: Accounts,
      },
      {
        // Natural URL guess; canonical paginated route is /account/:page.
        path: "/account",
        redirect: "/account/1",
      },
      {
        // Plural variant — also a common guess.
        path: "/accounts",
        redirect: "/account/1",
      },
      {
        // Etherscan-style guess.
        path: "/address",
        redirect: "/account/1",
      },
      {
        path: "/treasury",
        name: "treasury",
        meta: { titleKey: "pageTitles.treasury" },
        component: Treasury,
      },
      {
        path: "/account-profile/:accountAddress",
        name: "accountProfile",
        meta: { titleKey: "pageTitles.addressDetail" },
        component: AddressDetail,
      },
      {
        path: "/tokens/:tab/:page",
        name: "tokens",
        meta: { titleKey: "pageTitles.tokens" },
        component: Tokens,
      },
      {
        // Natural URL guesses; canonical paginated route requires :tab + :page.
        path: "/tokens",
        redirect: "/tokens/nep17/1",
      },
      {
        path: "/tokens/:tab",
        redirect: (to) => `/tokens/${to.params.tab}/1`,
      },
      {
        // Singular guess.
        path: "/token",
        redirect: "/tokens/nep17/1",
      },
      {
        path: "/nep17-token-info/:hash",
        name: "nep17TokenDetail",
        meta: { titleKey: "pageTitles.nep17Token" },
        component: TokenDetail,
      },
      {
        path: "/nft-token-info/:hash",
        name: "nep11TokenDetail",
        meta: { titleKey: "pageTitles.nftCollection" },
        component: TokenInfoNep11,
      },
      {
        path: "/candidates/:page",
        name: "candidates",
        meta: { titleKey: "pageTitles.consensusNodes" },
        component: Candidates,
      },
      {
        // Natural URL guess; canonical paginated route is /candidates/:page.
        path: "/candidates",
        redirect: "/candidates/1",
      },
      {
        path: "/burn",
        name: "burn",
        meta: { titleKey: "pageTitles.burnedGas" },
        component: BurnFee,
      },
      {
        path: "/verify-contract/:contractHash?",
        name: "verifyContract",
        meta: { titleKey: "pageTitles.verifyContract" },
        component: VerifyContract,
      },
      {
        path: "/source-code",
        name: "sourceCode",
        meta: { titleKey: "pageTitles.sourceCode" },
        component: SourceCode,
      },
      {
        path: "/echarts",
        name: "charts",
        meta: { titleKey: "pageTitles.chartsStatistics" },
        component: ChartsPage,
      },
      {
        // Natural URL guess; the canonical route is /echarts.
        path: "/charts",
        redirect: "/echarts",
      },
      {
        path: "/api-docs",
        name: "apiDocs",
        meta: { titleKey: "pageTitles.apiDocumentation" },
        component: ApiDocs,
      },
      {
        path: "/nft-info/:contractHash/:address/:tokenId",
        name: "nftDetail",
        meta: { titleKey: "pageTitles.nftDetail" },
        component: NFTInfo,
      },
      {
        path: "/gas-tracker",
        name: "gasTracker",
        meta: { titleKey: "pageTitles.gasTracker" },
        component: GasTracker,
      },
      {
        path: "/network-status",
        name: "networkStatus",
        meta: { titleKey: "pageTitles.networkStatus" },
        component: NetworkStatus,
      },
      {
        path: "/advanced-search",
        name: "advancedSearch",
        meta: { titleKey: "pageTitles.advancedSearch" },
        component: AdvancedSearch,
      },
      {
        path: "/governance",
        name: "governance",
        meta: { titleKey: "pageTitles.governance" },
        component: Governance,
      },
      {
        path: "/chat",
        name: "chat",
        meta: { titleKey: "pageTitles.neoChat" },
        component: ChatPage,
      },
      {
        path: "/tx/:txhash/trace",
        name: "txExecutionTrace",
        meta: { titleKey: "pageTitles.executionTrace" },
        component: TxExecutionTrace,
      },
      {
        path: "search",
        name: "search",
        meta: { titleKey: "pageTitles.searchResults" },
        component: Search,
      },
      {
        path: "/:pathMatch(.*)*",
        name: "notFound",
        meta: { titleKey: "pageTitles.pageNotFound" },
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
    // Wait for the next animation frame so the browser has committed
    // layout for the freshly rendered page before vue-router calls
    // window.scrollTo. Without this, the perf trace shows ~200ms of
    // forced reflow on initial navigation as scrollToPosition runs
    // mid-render. Microtask-only deferral (vue-router's default
    // nextTick) doesn't include a layout pass.
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(savedPosition || { top: 0 });
      });
    });
  },
});

// Catch lazy-load and navigation failures
router.onError((error) => {
  // Report to telemetry via the global capture hook (set in main.js) so
  // navigation/chunk failures are no longer silently dropped in production.
  if (typeof globalThis !== "undefined" && typeof globalThis.__neoExplorerCaptureError__ === "function") {
    globalThis.__neoExplorerCaptureError__(error, { source: "router" });
  }
  if (import.meta.env.DEV) {
    console.error("Router error:", error);
  }
  // A lazy route chunk that 404s after a deploy should trigger the same
  // one-time reload recovery the per-route import wrapper uses.
  if (isChunkLoadError(error)) {
    triggerChunkReload(pendingRoutePath);
  }
});

router.beforeEach((to, _from, next) => {
  pendingRoutePath = to?.fullPath || to?.path || "/homepage";
  sessionStorage.setItem(CHUNK_RELOAD_TARGET_KEY, pendingRoutePath);
  next();
});

function resolveRouteTitle(meta) {
  const titleKey = meta?.titleKey;
  const i18n = typeof globalThis !== "undefined" ? globalThis.__neoExplorerI18n__ : null;
  if (titleKey && i18n?.global?.t) {
    const translated = i18n.global.t(titleKey);
    if (translated && translated !== titleKey) return translated;
  }
  return meta?.title || "";
}

function applyDocumentTitle(meta) {
  const title = resolveRouteTitle(meta);
  document.title = title ? `${title} | Neo Explorer` : "Neo Explorer";
}

// Expose a refresher on globalThis so the language selector can re-resolve
// the title after locale change without importing the router (which would
// pull vue-router into test mocks that don't provide createRouter).
if (typeof globalThis !== "undefined") {
  globalThis.__neoExplorerRefreshDocumentTitle__ = () => {
    applyDocumentTitle(router.currentRoute.value?.meta);
  };
}

// Clear chunk reload flag on successful navigation & set document title.
// Also strip the __chunk_reload cache-bust query param the recovery flow
// appends, so the URL bar / shared links don't carry a stale timestamp.
router.afterEach((to) => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  sessionStorage.removeItem(CHUNK_RELOAD_TARGET_KEY);
  if (Object.prototype.hasOwnProperty.call(to.query || {}, CHUNK_RELOAD_QUERY_KEY)) {
    const cleaned = { ...to.query };
    delete cleaned[CHUNK_RELOAD_QUERY_KEY];
    router.replace({ path: to.path, query: cleaned, hash: to.hash });
  }
  applyDocumentTitle(to.meta);
});

export default router;
