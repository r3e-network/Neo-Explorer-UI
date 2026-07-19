import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROUTER_SOURCE = readFileSync(path.join(process.cwd(), "src/router/index.js"), "utf8");

function namedRoutesFromRouterSource(source) {
  return [...source.matchAll(/\bname:\s*"([^"]+)"/g)].map((match) => match[1]);
}

// This manifest is a drift guard for the full Explorer page audit. Each named
// route must have at least one explicit evidence source: production API page
// audit, browser render audit, or focused unit/source test coverage.
const ROUTE_AUDIT_EVIDENCE = Object.freeze({
  homepage: ["tests/pages.test.js", "tests/views/HomePage.spec.js", "browser-render-audit"],
  nns: ["tests/pages.test.js", "tests/views/MatrixDomainNetworkChange.spec.js", "browser-render-audit"],
  matrix: ["tests/pages.test.js", "tests/views/MatrixDomainRegistration.spec.js", "browser-render-audit"],
  tools: ["browser-render-audit", "src/views/Tools/ToolsIndex.vue source audit"],
  multisig: ["tests/pages.test.js", "tests/views/MultiSigToolNetworkChange.spec.js", "browser-render-audit"],
  governanceTool: ["tests/pages.test.js", "tests/views/GovernanceToolNetworkChange.spec.js", "browser-render-audit"],
  governanceProposalDetail: ["tests/views/GovernanceProposalDetail.spec.js", "browser-render-audit"],
  formatConverter: ["browser-render-audit", "src/views/Tools/FormatConverterTool.vue source audit"],
  neofsGateway: ["browser-render-audit", "src/views/Tools/NeoFSTool.vue source audit"],
  candidateProfileManager: ["tests/views/CandidateProfileTool.spec.js", "browser-render-audit"],
  broadcastMessage: ["tests/views/BroadcastMessageTool.spec.js", "browser-render-audit"],
  sponsoredTransactions: ["tests/views/SponsoredTool.spec.js", "browser-render-audit"],
  contractDeployer: ["tests/views/ContractDeployerTool.spec.js", "browser-render-audit"],
  contractFactory: ["tests/views/ContractFactoryTool.spec.js", "browser-render-audit"],
  abiEncoder: ["browser-render-audit", "src/views/Tools/AbiEncoderTool.vue source audit"],
  storageInspector: ["browser-render-audit", "src/views/Tools/StorageInspectorTool.vue source audit"],
  gasEstimator: ["tests/views/GasEstimatorTool.spec.js", "browser-render-audit"],
  mempoolTool: ["tests/pages.test.js", "tests/views/MempoolToolNetworkChange.spec.js", "browser-render-audit"],
  networkAlerts: ["tests/views/NetworkAlertsToolNetworkChange.spec.js", "browser-render-audit"],
  abstractAccountDeployer: ["tests/views/AbstractAccountTool.spec.js", "browser-render-audit"],
  blocks: ["tests/pages.test.js", "tests/services/blockService.spec.js", "browser-render-audit"],
  blockDetail: ["tests/pages.test.js", "tests/views/BlockOverview.spec.js", "browser-render-audit"],
  transactions: ["tests/pages.test.js", "tests/services/transactionService.spec.js", "browser-render-audit"],
  transactionDetail: ["tests/pages.test.js", "tests/views/TxDetailNetworkChange.spec.js", "browser-render-audit"],
  contracts: ["tests/pages.test.js", "tests/services/contractService.spec.js", "browser-render-audit"],
  contractDetail: ["tests/pages.test.js", "tests/views/ContractDetailFallback.spec.js", "browser-render-audit"],
  accounts: ["tests/pages.test.js", "tests/services/accountService.spec.js", "browser-render-audit"],
  treasury: ["tests/views/Treasury.spec.js", "browser-render-audit"],
  accountProfile: ["tests/pages.test.js", "tests/views/AddressDetailNetworkChange.spec.js", "browser-render-audit"],
  tokens: ["tests/pages.test.js", "tests/views/Tokens.spec.js", "browser-render-audit"],
  nep17TokenDetail: ["tests/pages.test.js", "tests/views/TokenDetail.spec.js", "browser-render-audit"],
  nep11TokenDetail: ["tests/views/Tokens.spec.js", "tests/services/tokenService.spec.js", "browser-render-audit"],
  candidates: ["tests/pages.test.js", "tests/views/Candidates.spec.js", "browser-render-audit"],
  burn: ["browser-render-audit", "src/views/BurnGas/BurnFee.vue source audit"],
  verifyContract: ["tests/views/VerifyContract.spec.js", "browser-render-audit"],
  sourceCode: ["tests/utils/detailRouting.spec.js", "browser-render-audit"],
  charts: ["tests/pages.test.js", "browser-render-audit"],
  apiDocs: ["tests/pages.test.js", "browser-render-audit"],
  nftDetail: ["tests/views/NFTInfoOwner.spec.js", "tests/views/NFTInfoNetworkChange.spec.js"],
  gasTracker: ["tests/views/GasTracker.spec.js", "browser-render-audit"],
  networkStatus: ["tests/services/networkMonitorService.spec.js", "browser-render-audit"],
  consensusStatus: ["tests/services/consensusStatusService.spec.js", "tests/views/ConsensusStatusSource.spec.js", "browser-render-audit"],
  advancedSearch: ["tests/utils/searchRouting.spec.js", "browser-render-audit"],
  governance: ["tests/pages.test.js", "tests/views/Governance.spec.js", "browser-render-audit"],
  chat: ["tests/views/ChatPage.spec.js", "tests/services/chatService.spec.js", "browser-render-audit"],
  txExecutionTrace: ["tests/views/TxExecutionTraceSource.spec.js", "browser-render-audit"],
  search: ["tests/utils/searchRouting.spec.js", "browser-render-audit"],
  notFound: ["browser-render-audit", "src/views/NotFound/PageNotFound.vue source audit"],
  xHome: ["tests/adapters/neox.spec.js", "src/views/X/XHome.vue source audit"],
  xBlocks: ["tests/adapters/neox.spec.js", "src/views/X/XBlocks.vue source audit"],
  xBlockDetail: ["tests/adapters/neox.spec.js", "src/views/X/XBlockDetail.vue source audit"],
  xTransactions: ["tests/adapters/neox.spec.js", "src/views/X/XTransactions.vue source audit"],
  xTxDetail: ["tests/adapters/neox.spec.js", "src/views/X/XTxDetail.vue source audit"],
  xAddress: ["tests/adapters/neox.spec.js", "src/views/X/XAddressDetail.vue source audit"],
  xTokens: ["tests/adapters/neox.spec.js", "src/views/X/XTokens.vue source audit"],
  xToken: ["tests/adapters/neox.spec.js", "src/views/X/XTokenDetail.vue source audit"],
  xContracts: ["src/views/X/XContracts.vue source audit"],
  xAccounts: ["src/views/X/XAccounts.vue source audit"],
});

describe("Explorer route audit coverage", () => {
  it("has explicit audit evidence for every named route", () => {
    const routeNames = namedRoutesFromRouterSource(ROUTER_SOURCE);
    const missing = routeNames.filter((name) => !ROUTE_AUDIT_EVIDENCE[name]?.length);

    expect(missing).toEqual([]);
  });

  it("does not keep stale coverage entries for removed routes", () => {
    const routeNames = new Set(namedRoutesFromRouterSource(ROUTER_SOURCE));
    const stale = Object.keys(ROUTE_AUDIT_EVIDENCE).filter((name) => !routeNames.has(name));

    expect(stale).toEqual([]);
  });
});
