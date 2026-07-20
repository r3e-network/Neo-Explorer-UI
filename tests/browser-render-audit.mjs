#!/usr/bin/env node
/**
 * Browser render audit for every named Explorer route.
 *
 * Runs Chrome headless through the DevTools Protocol directly; no Playwright
 * or Puppeteer dependency is required. It verifies real production rendering,
 * console/runtime errors, failed document/script/style loads, blank pages, and
 * obvious horizontal overflow.
 *
 * Useful filters:
 *   BROWSER_AUDIT_ROUTE=homepage,apiDocs
 *   BROWSER_AUDIT_ROUTE='/contractDetail|governance/'
 *   BROWSER_AUDIT_VIEWPORT=desktop,mobile
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const WEB_BASE = (process.env.TEST_WEB_URL || "https://www.neo3scan.com").replace(/\/+$/, "");
const API_BASE = (process.env.TEST_API_URL || "https://api.n3index.dev").replace(/\/+$/, "");
const CHROME_PATH = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = process.env.BROWSER_AUDIT_OUT_DIR || path.join(process.cwd(), "test-results/browser-render-audit");
const CAPTURE_SCREENSHOTS = process.env.CAPTURE_SCREENSHOTS || "failures";
const PAGE_TIMEOUT_MS = Number(process.env.BROWSER_AUDIT_PAGE_TIMEOUT_MS || 25000);
const SETTLE_MS = Number(process.env.BROWSER_AUDIT_SETTLE_MS || 9000);
const MIN_TEXT_LENGTH = Number(process.env.BROWSER_AUDIT_MIN_TEXT_LENGTH || 80);
const ROUTE_FILTER = process.env.BROWSER_AUDIT_ROUTE || "";
const VIEWPORT_FILTER = process.env.BROWSER_AUDIT_VIEWPORT || "";
const STABLE_TRACE_TXID = process.env.BROWSER_AUDIT_TRACE_TXID || "0x5f873503cfbd113dadde69029128008f67818f71cac90140acea7ae816212b90";
const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const FALLBACK_ADDRESS = "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";
const NEOX_BLOCK_INDEX = 7152440;
const NEOX_TX_HASH = "0xb1d41fc5b4479cf109a01689b580c0330e842c9b029f2b9838dac8ef9a07374d";
const NEOX_ADDRESS = "0x1212000000000000000000000000000000000004";
const NEOX_TOKEN_HASH = "0x3e5E77bC7b2092fD0a9Cf9F6cbeB8198d659362d";
const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  { label: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
];

const VISIBLE_SKELETON_COUNT_EXPR = `(() => [...document.querySelectorAll('.animate-pulse')].filter((node) => {
  const style = getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
}).length)()`;

const ROUTES = [
  ["homepage", () => "/homepage"],
  ["nns", () => "/nns"],
  ["matrix", () => "/matrix"],
  ["tools", () => "/tools"],
  ["multisig", () => "/tools/multisig", true],
  ["governanceTool", () => "/tools/governance", true],
  ["governanceProposalDetail", (d) => `/tools/governance/${encodeURIComponent(d.governanceProposalId)}`, true],
  ["formatConverter", () => "/tools/b64"],
  ["neofsGateway", () => "/tools/neofs"],
  ["candidateProfileManager", () => "/tools/candidate-profile", true],
  ["broadcastMessage", () => "/tools/broadcast", true],
  ["sponsoredTransactions", () => "/tools/sponsored", true],
  ["contractDeployer", () => "/tools/deployer", true],
  ["contractFactory", () => "/tools/factory", true],
  ["abiEncoder", () => "/tools/abi"],
  ["storageInspector", () => "/tools/storage"],
  ["gasEstimator", () => "/tools/gas"],
  ["mempoolTool", () => "/tools/mempool"],
  ["networkAlerts", () => "/tools/alerts"],
  ["abstractAccountDeployer", () => "/tools/abstract-account", true],
  ["blocks", () => "/blocks/1"],
  ["blockDetail", (d) => `/block-info/${encodeURIComponent(String(d.blockIndex))}`],
  ["transactions", () => "/transactions/1"],
  ["transactionDetail", (d) => `/transaction-info/${encodeURIComponent(d.txid)}`],
  ["contracts", () => "/contracts/1"],
  ["contractDetail", () => `/contract-info/${NEO_HASH}`],
  ["accounts", () => "/account/1"],
  ["treasury", () => "/treasury"],
  ["accountProfile", (d) => `/account-profile/${encodeURIComponent(d.address)}`],
  ["tokens", () => "/tokens/nep17/1"],
  ["nep17TokenDetail", () => `/nep17-token-info/${GAS_HASH}`],
  ["nep11TokenDetail", (d) => `/nft-token-info/${d.nep11ContractHash}`],
  ["candidates", () => "/candidates/1"],
  ["burn", () => "/burn"],
  ["verifyContract", () => `/verify-contract/${NEO_HASH}`],
  ["sourceCode", () => "/source-code"],
  ["charts", () => "/echarts"],
  ["apiDocs", () => "/api-docs"],
  ["nftDetail", (d) => `/nft-info/${d.nep11ContractHash}/${encodeURIComponent(d.nftOwnerAddress)}/${encodeURIComponent(d.nftTokenId)}`],
  ["gasTracker", () => "/gas-tracker"],
  ["networkStatus", () => "/network-status"],
  ["advancedSearch", () => "/advanced-search"],
  ["governance", () => "/governance"],
  ["chat", () => "/chat", true],
  ["txExecutionTrace", (d) => `/tx/${encodeURIComponent(d.traceTxid || d.txid)}/trace`],
  ["search", (d) => `/search?keyword=${encodeURIComponent(d.txid)}`],
  ["xHome", () => "/x"],
  ["xBlocks", () => "/x/blocks"],
  ["xBlockDetail", (d) => `/x/block-info/${encodeURIComponent(String(d.neoxBlockIndex))}`],
  ["xTransactions", () => "/x/transactions"],
  ["xTxDetail", (d) => `/x/tx/${encodeURIComponent(d.neoxTxHash)}`],
  ["xAddress", (d) => `/x/address/${encodeURIComponent(d.neoxAddress)}`],
  ["xTokens", () => "/x/tokens"],
  ["xToken", (d) => `/x/token/${encodeURIComponent(d.neoxTokenHash)}`],
  ["xContracts", () => "/x/contracts"],
  ["xAccounts", () => "/x/accounts"],
  ["xCharts", () => "/x/charts"],
  ["notFound", () => "/__browser_audit_missing_route__"],
].map(([name, makePath, allowAuthFailures = false]) => ({ name, makePath, allowAuthFailures }));

function parseNameFilter(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item.length > 2 && item.startsWith("/") && item.endsWith("/")) {
        return { type: "regex", value: new RegExp(item.slice(1, -1)) };
      }
      return { type: "exact", value: item };
    });
}

function matchesNameFilter(name, filters) {
  if (!filters.length) return true;
  return filters.some((filter) => {
    if (filter.type === "regex") return filter.value.test(name);
    return name === filter.value;
  });
}

function describeAvailableNames(items) {
  return items.map((item) => item.name || item.label).join(", ");
}

class CDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP open timeout")), 10000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("CDP websocket error"));
      }, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.#message(JSON.parse(event.data)));
  }

  on(method, fn) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(fn);
    this.handlers.set(method, handlers);
  }

  send(method, params = {}) {
    const id = this.id++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 10000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  close() {
    this.ws?.close();
  }

  #message(message) {
    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || "CDP error"));
      else pending.resolve(message.result || {});
      return;
    }
    for (const fn of this.handlers.get(message.method) || []) fn(message.params || {});
  }
}

async function fetchJSON(url, fallback) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    return response.ok ? await response.json() : fallback;
  } catch {
    return fallback;
  }
}

async function discoverData() {
  const blocks = await fetchJSON(`${API_BASE}/mainnet/blocks?limit=2`, {});
  const block = Array.isArray(blocks?.data) ? blocks.data[0] : Array.isArray(blocks) ? blocks[0] : {};
  const txs = await fetchJSON(`${API_BASE}/mainnet/transactions?limit=2`, {});
  const tx = Array.isArray(txs?.data) ? txs.data[0] : Array.isArray(txs) ? txs[0] : {};
  const nep11 = await fetchJSON(`${API_BASE}/rest/v1/nep11_transfers?network=eq.mainnet&limit=1`, []);
  const nft = Array.isArray(nep11) ? nep11[0] || {} : {};
  const governanceRequests = await fetchJSON(`${WEB_BASE}/api/multisig/requests?network=mainnet&limit=1`, []);
  const governanceRequest = Array.isArray(governanceRequests?.data)
    ? governanceRequests.data[0]
    : Array.isArray(governanceRequests)
      ? governanceRequests[0]
      : {};
  return {
    blockIndex: block?.block_index ?? block?.index ?? 1,
    blockHash: block?.hash || "",
    txid: tx?.txid || tx?.hash || "0x5f873503cfbd113dadde69029128008f67818f71cac90140acea7ae816212b90",
    traceTxid: STABLE_TRACE_TXID,
    address: tx?.sender || tx?.from || FALLBACK_ADDRESS,
    nep11ContractHash: nft?.contract_hash || NEO_HASH,
    nftOwnerAddress: nft?.to_address || nft?.from_address || FALLBACK_ADDRESS,
    nftTokenId: nft?.token_id_decoded || nft?.token_id_raw || "0",
    governanceProposalId: governanceRequest?.id || governanceRequest?.proposal_id || "missing",
    neoxBlockIndex: NEOX_BLOCK_INDEX,
    neoxTxHash: NEOX_TX_HASH,
    neoxAddress: NEOX_ADDRESS,
    neoxTokenHash: NEOX_TOKEN_HASH,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForContent(cdp) {
  const deadline = Date.now() + SETTLE_MS;
  let readyCount = 0;
  while (Date.now() < deadline) {
    const result = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => ({
        textLength: ((document.body.innerText || '').replace(/\\s+/g, ' ').trim()).length,
        skeletonCount: ${VISIBLE_SKELETON_COUNT_EXPR},
        hasOverlay: Boolean(document.querySelector('.vite-error-overlay,#webpack-dev-server-client-overlay,[data-nextjs-dialog]'))
      }))()`,
    });
    const value = result.result?.value || {};
    if (value.hasOverlay || (value.textLength >= MIN_TEXT_LENGTH && value.skeletonCount === 0)) {
      readyCount += 1;
      if (readyCount >= 2) return;
    } else {
      readyCount = 0;
    }
    await sleep(500);
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function launchChrome() {
  const port = await freePort();
  const profile = await mkdtemp(path.join(tmpdir(), "neo-explorer-browser-audit-"));
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--disable-background-networking",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-sync",
    "--hide-scrollbars",
    "--mute-audio",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return { chrome, port, profile };
    } catch {
      // wait
    }
    await sleep(125);
  }
  chrome.kill("SIGKILL");
  await rm(profile, { recursive: true, force: true });
  throw new Error(`Chrome did not start: ${stderr.slice(0, 400)}`);
}

async function stopChrome(chrome, profile) {
  let exited = false;
  chrome.once("exit", () => {
    exited = true;
  });
  chrome.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => chrome.once("exit", resolve)),
    sleep(3000),
  ]);
  if (!exited) {
    chrome.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => chrome.once("exit", resolve)),
      sleep(2000),
    ]);
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 7) {
        console.warn(`warning: could not remove Chrome profile ${profile}: ${error.message}`);
        return;
      }
      await sleep(250);
    }
  }
}

async function newPage(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Chrome target create failed: HTTP ${response.status}`);
  const target = await response.json();
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.connect();
  return { target, cdp };
}

async function closePage(port, target, cdp) {
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
}

function protectedRequest(url, status) {
  return status === 401 && /\/api\/(chat|cron|relayer|sponsor|governance\/signature)/.test(url);
}

function classifyResponse(route, response) {
  if (response.status < 400) return null;
  if (protectedRequest(response.url, response.status) || route.allowAuthFailures) return ["warn", `expected/protected ${response.type} HTTP ${response.status} ${response.url}`];
  if (["Document", "Script", "Stylesheet"].includes(response.type)) return ["fail", `${response.type} HTTP ${response.status} ${response.url}`];
  if (["Fetch", "XHR"].includes(response.type) && response.status >= 500) return ["fail", `${response.type} HTTP ${response.status} ${response.url}`];
  return ["warn", `${response.type} HTTP ${response.status} ${response.url}`];
}

async function auditRoute(port, route, data, viewport, outDir) {
  const { target, cdp } = await newPage(port);
  const url = `${WEB_BASE}${route.makePath(data)}`;
  const consoleErrors = [];
  const exceptions = [];
  const requestFailures = [];
  const badResponses = [];
  const requestTypes = new Map();
  let loadFired = false;
  let resolveLoad;
  const loadPromise = new Promise((resolve) => {
    resolveLoad = resolve;
  });

  cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type !== "error") return;
    const text = (event.args || []).map((arg) => arg.value || arg.description || "").join(" ").trim();
    if (text && !/ResizeObserver loop/i.test(text) && !/status of 401/i.test(text)) consoleErrors.push(text);
  });
  cdp.on("Runtime.exceptionThrown", (event) => {
    exceptions.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || "Runtime exception");
  });
  cdp.on("Network.requestWillBeSent", (event) => {
    requestTypes.set(event.requestId, { url: event.request?.url || "", type: event.type || "Other" });
  });
  cdp.on("Network.responseReceived", (event) => {
    const response = {
      url: event.response?.url || "",
      status: event.response?.status || 0,
      type: event.type || requestTypes.get(event.requestId)?.type || "Other",
    };
    const classified = classifyResponse(route, response);
    if (classified) badResponses.push({ severity: classified[0], message: classified[1] });
  });
  cdp.on("Network.loadingFailed", (event) => {
    if (event.errorText === "net::ERR_ABORTED") return;
    const request = requestTypes.get(event.requestId) || {};
    requestFailures.push(`${request.type || event.type || "Other"} ${event.errorText || "failed"} ${request.url || ""}`);
  });
  cdp.on("Page.loadEventFired", () => {
    loadFired = true;
    resolveLoad();
  });

  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", viewport);
    await cdp.send("Page.navigate", { url });
    await Promise.race([loadPromise, sleep(PAGE_TIMEOUT_MS)]);
    await waitForContent(cdp);

    const dom = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const text = (document.body.innerText || '').replace(/\\s+/g, ' ').trim();
        const overlay = document.querySelector('.vite-error-overlay,#webpack-dev-server-client-overlay,[data-nextjs-dialog]');
        const headings = [...document.querySelectorAll('h1,h2,[role="heading"]')]
          .map((node) => (node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim())
          .filter(Boolean).slice(0, 5);
        return {
          title: document.title,
          url: location.href,
          textLength: text.length,
          textPreview: text.slice(0, 160),
          headings,
          hasOverlay: Boolean(overlay),
          overlayText: overlay ? (overlay.innerText || overlay.textContent || '').slice(0, 400) : '',
          skeletonCount: ${VISIBLE_SKELETON_COUNT_EXPR},
          horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      })()`,
    });
    const perf = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        return {
          navigationMs: nav ? Math.round(nav.duration) : null,
          resourceCount: resources.length,
          transferBytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
        };
      })()`,
    });

    const details = dom.result?.value || {};
    const failures = [];
    const warnings = [];
    if (!loadFired) failures.push("load event did not fire before timeout");
    if (details.hasOverlay) failures.push(`framework overlay: ${details.overlayText}`);
    if (details.skeletonCount > 0) failures.push(`loading skeletons still visible (${details.skeletonCount})`);
    if (details.textLength < MIN_TEXT_LENGTH) failures.push(`body text too short (${details.textLength})`);
    if (details.horizontalOverflowPx > 12) failures.push(`horizontal overflow ${details.horizontalOverflowPx}px`);
    if (route.name === "blockDetail" && details.headings?.some((heading) => /^Block #0\b/.test(heading))) {
      failures.push("block detail rendered placeholder Block #0");
    }
    if (route.name === "contractDetail" && /^Unknown Contract\b/.test(details.headings?.[0] || "")) {
      failures.push("contract detail rendered placeholder Unknown Contract");
    }
    if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
    if (exceptions.length) failures.push(`runtime exceptions: ${exceptions.slice(0, 3).join(" | ")}`);
    if (requestFailures.length) failures.push(`request failures: ${requestFailures.slice(0, 3).join(" | ")}`);
    for (const item of badResponses) {
      if (item.severity === "fail") failures.push(item.message);
      else warnings.push(item.message);
    }

    let screenshotPath = "";
    if (CAPTURE_SCREENSHOTS === "all" || (CAPTURE_SCREENSHOTS === "failures" && failures.length)) {
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      screenshotPath = path.join(outDir, `${route.name}-${viewport.label}.png`);
      await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
    }

    return {
      name: route.name,
      viewport: viewport.label,
      url,
      ok: failures.length === 0,
      failures,
      warnings,
      dom: details,
      perf: perf.result?.value || {},
      screenshotPath,
    };
  } finally {
    await closePage(port, target, cdp);
  }
}

function printResult(result) {
  const status = result.ok ? "PASS" : "FAIL";
  const heading = result.dom.headings?.[0] || result.dom.title || "";
  const nav = result.perf.navigationMs == null ? "-" : `${result.perf.navigationMs}ms`;
  console.log(`${status.padEnd(4)} ${result.viewport.padEnd(7)} ${result.name.padEnd(30)} text=${String(result.dom.textLength).padStart(5)} nav=${nav.padStart(7)} ${heading}`);
  for (const failure of result.failures.slice(0, 4)) console.log(`      failure: ${failure.slice(0, 220)}`);
  for (const warning of result.warnings.slice(0, 2)) console.log(`      warning: ${warning.slice(0, 220)}`);
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUT_DIR, stamp);
  await mkdir(outDir, { recursive: true });
  const data = await discoverData();
  const { chrome, port, profile } = await launchChrome();
  const results = [];
  try {
    console.log(`Browser render audit: ${WEB_BASE}`);
    console.log(`Output: ${outDir}`);
    const routeFilters = parseNameFilter(ROUTE_FILTER);
    const viewportFilters = parseNameFilter(VIEWPORT_FILTER);
    const routes = ROUTES.filter((route) => matchesNameFilter(route.name, routeFilters));
    const viewports = VIEWPORTS.filter((viewport) => matchesNameFilter(viewport.label, viewportFilters));
    if (!routes.length) {
      throw new Error(
        `No route matched BROWSER_AUDIT_ROUTE=${ROUTE_FILTER}. Use an exact name, comma-separated names, or /regex/. Available: ${describeAvailableNames(ROUTES)}`
      );
    }
    if (!viewports.length) {
      throw new Error(
        `No viewport matched BROWSER_AUDIT_VIEWPORT=${VIEWPORT_FILTER}. Use desktop, mobile, comma-separated names, or /regex/.`
      );
    }
    console.log(`Routes: ${routes.length}; viewports: ${viewports.map((v) => v.label).join(", ")}`);
    for (const route of routes) {
      for (const viewport of viewports) {
        const result = await auditRoute(port, route, data, viewport, outDir);
        results.push(result);
        printResult(result);
      }
    }
  } finally {
    await stopChrome(chrome, profile);
  }
  const reportPath = path.join(outDir, "report.json");
  await writeFile(reportPath, JSON.stringify({ webBase: WEB_BASE, apiBase: API_BASE, data, results }, null, 2));
  const failures = results.filter((item) => !item.ok);
  const warnings = results.reduce((sum, item) => sum + item.warnings.length, 0);
  console.log("");
  console.log(`Summary: ${results.length - failures.length} passed / ${failures.length} failed / ${warnings} warnings`);
  console.log(`Report: ${reportPath}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
