import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { contractService } from "./contractService";
import { NATIVE_CONTRACTS, CONTRACT_MANAGEMENT_HASH } from "@/constants";
import { decodeNotificationParams } from "@/utils/neoCodec";
import { extractVmStateFromAppLog, extractVmStateFromObject } from "@/utils/txVmState";
import { callWithRpcEndpointFallback, toNetworkMode } from "@/utils/rpcEndpoints";

/**
 * Execution Service - Neo3 交易执行追踪
 * @module services/executionService
 * @description 解析应用日志，构建合约调用树，解码通知事件
 */
export const executionService = createService(
  {
    _getExecutionTraceIndexed: {
      cacheKey: "exec_trace",
      rpcMethod: "GetApplicationLogByTransactionHash",
      fallback: null,
      ttl: CACHE_TTL.trace,
      buildParams: ([txHash]) => ({ TransactionHash: txHash }),
      buildCacheParams: ([txHash]) => ({ txHash }),
    },
    _getExecutionTraceLegacy: {
      cacheKey: "exec_trace_legacy",
      rpcMethod: "getapplicationlog",
      fallback: null,
      ttl: CACHE_TTL.trace,
      buildParams: ([txHash]) => [txHash],
      buildCacheParams: ([txHash]) => ({ txHash }),
    },
    getDetailedTrace: {
      cacheKey: "exec_detailed_trace",
      rpcMethod: "GetExecutionTraceByTransactionHash",
      fallback: null,
      ttl: CACHE_TTL.trace,
      buildParams: ([txHash]) => ({ TransactionHash: txHash }),
      buildCacheParams: ([txHash]) => ({ txHash }),
    },
  },
  {
    async getExecutionTrace(txHash, options = {}) {
      let indexed = null;
      try {
        indexed = this._normalizeExecutionTrace(await this._getExecutionTraceIndexed(txHash, options));
      } catch (_err) { /* ignore */ }

      const indexedNotifications = this._countNotifications(indexed);

      if (indexedNotifications > 0) {
        return indexed;
      }

      let legacy = null;
      try {
        legacy = this._normalizeExecutionTrace(await this._getExecutionTraceLegacy(txHash, options));
      } catch (_err) {
        legacy = null;
      }

      // If Fura proxy failed, hit the native Node RPC directly
      if (!indexed && !legacy) {
        try {
          const { rpc: neonRpc } = await import('@cityofzion/neon-js');
          const { getCurrentEnv } = await import('@/utils/env');
          const network = toNetworkMode(getCurrentEnv());
          const nativeLog = await callWithRpcEndpointFallback(network, async (endpoint) => {
            const client = new neonRpc.RPCClient(endpoint);
            return client.getApplicationLog(txHash);
          });
          if (nativeLog) {
            legacy = this._normalizeExecutionTrace(nativeLog);
          }
        } catch (_nativeErr) {
          // ignore native error
        }
      }

      if (!indexed && legacy) return legacy;
      if (this._countNotifications(legacy) > indexedNotifications) return legacy;
      if (!extractVmStateFromAppLog(indexed) && extractVmStateFromAppLog(legacy)) return legacy;
      return indexed || legacy;
    },

    /**
     * 判断是否为复杂交易（多合约通知或嵌套调用）
     * @param {Object} appLog - 应用日志对象
     * @returns {boolean} 是否复杂交易
     */
    isComplexTransaction(appLog) {
      if (!appLog) return false;

      const executions = appLog.executions ?? [];
      if (executions.length > 1) return true;

      for (const exec of executions) {
        if (exec.vmstate === "FAULT") return true;

        const notifications = exec.notifications ?? [];
        if (notifications.length === 0) continue;
        
        // Count unique contracts involved in notifications
        const uniqueContracts = new Set();
        for (const n of notifications) {
          if (n && n.contract) {
            uniqueContracts.add(n.contract);
          }
        }
        
        if (uniqueContracts.size > 1) return true;
        
        // If it involves only 1 contract, but has many notifications, 
        // we might still consider it complex, but for now we only flag
        // if there are multiple contracts or non-standard transfers.
        // Let's check if there are non-transfer events
        for (const n of notifications) {
          const eventName = (n.eventname ?? "").toLowerCase();
          if (eventName !== "transfer" && eventName !== "mint" && eventName !== "burn") return true;
        }
      }

      return false;
    },

    _countNotifications(appLog) {
      const executions = appLog?.executions ?? [];
      return executions.reduce((sum, exec) => sum + (exec?.notifications?.length || 0), 0);
    },

    _normalizeExecutionTrace(appLog) {
      if (!appLog || typeof appLog !== "object") return appLog;

      if (Array.isArray(appLog.executions)) {
        const executions = appLog.executions.map((exec) => {
          if (!exec || typeof exec !== "object") return exec;
          const normalized = extractVmStateFromObject(exec);
          if (!normalized || exec.vmstate === normalized) return exec;
          return { ...exec, vmstate: normalized };
        });
        return { ...appLog, executions };
      }

      const vmstate = extractVmStateFromObject(appLog);
      const hasFlattenedExecutionFields =
        Boolean(vmstate) ||
        appLog.exception != null ||
        appLog.gasconsumed != null ||
        appLog.gasConsumed != null ||
        appLog.trigger != null ||
        Array.isArray(appLog.notifications) ||
        Array.isArray(appLog.stack);

      if (!hasFlattenedExecutionFields) return appLog;

      return {
        ...appLog,
        executions: [
          {
            trigger: appLog.trigger ?? "Application",
            vmstate,
            exception: appLog.exception ?? null,
            gasconsumed: appLog.gasconsumed ?? appLog.gasConsumed ?? "0",
            stack: Array.isArray(appLog.stack) ? appLog.stack : [],
            notifications: Array.isArray(appLog.notifications) ? appLog.notifications : [],
          },
        ],
      };
    },

    /**
     * 将扁平通知列表构建为层级调用树
     * @param {Object} appLog - 应用日志对象
     * @returns {Array} 层级调用树
     */
    buildCallTree(appLog) {
      if (!appLog) return [];

      const executions = appLog.executions ?? [];
      return executions.map((exec) => {
        const notifications = exec.notifications ?? [];

        const contractMap = new Map();
        for (const notification of notifications) {
          const hash = notification.contract ?? "unknown";
          if (!contractMap.has(hash)) {
            contractMap.set(hash, { contract: hash, events: [] });
          }
          contractMap.get(hash).events.push(this.decodeNotification(notification));
        }

        return {
          trigger: exec.trigger ?? "Application",
          vmState: exec.vmstate ?? "UNKNOWN",
          gasConsumed: exec.gasconsumed ?? "0",
          stack: exec.stack ?? [],
          children: Array.from(contractMap.values()),
        };
      });
    },

    /**
     * 解码单个通知事件
     * @param {Object} notification - 原始通知对象
     * @returns {Object} 解码后的通知
     */
    decodeNotification(notification) {
      if (!notification) {
        return { contract: "unknown", eventName: "unknown", state: null };
      }
      return {
        contract: notification.contract ?? "unknown",
        eventName: notification.eventname ?? "unknown",
        state: notification.state ?? null,
      };
    },

    /**
     * Get enriched execution trace with decoded params, contract metadata,
     * and optional detailed trace (opcode steps) from neo3fura.
     * @param {string} txHash
     * @returns {Promise<Object|null>} Enriched trace data
     */
    async getEnrichedTrace(txHash) {
      const [appLog, detailedTrace] = await Promise.all([
        this.getExecutionTrace(txHash),
        this.getDetailedTrace(txHash).catch((err) => {
          if (import.meta.env.DEV) console.warn("Failed to load detailed trace:", err);
          return null;
        }),
      ]);
      if (!appLog) return null;

      const executions = appLog.executions ?? [];
      const contractHashes = new Set();
      for (const exec of executions) {
        for (const n of exec.notifications ?? []) {
          if (n != null && n.contract) contractHashes.add(n.contract);
        }
      }

      const { manifests: manifestMap } = await this._fetchManifests([...contractHashes]);

      const detailedExecs = detailedTrace?.executions ?? (detailedTrace?.steps ? [detailedTrace] : []);
      const enrichedExecutions = executions.map((exec, i) =>
        this._enrichExecution(exec, manifestMap, detailedExecs[i])
      );

      const transfers = enrichedExecutions.flatMap((e) =>
        (e.operations ?? []).filter((op) => op.operationType === "transfer")
      );

      return {
        raw: appLog,
        executions: enrichedExecutions,
        transfers,
        contractMetadata: manifestMap,
        isComplex: this.isComplexTransaction(appLog),
        detailedTrace,
      };
    },

    /** @private */
    _enrichExecution(exec, manifestMap, detailedExec) {
      const notifications = exec.notifications ?? [];
      const operations = notifications
        .filter((n) => n != null)
        .map((n, i) => {
          const hash = n.contract ?? "unknown";
          const eventName = n.eventname ?? "unknown";
          const manifest = manifestMap.get(hash);
          const eventDef = this._findEventDef(manifest, eventName);
          const decodedParams = eventDef ? decodeNotificationParams(n.state, eventDef) : [];
          const operationType = this._classifyOperation(eventName, hash);

          return {
            index: i,
            contract: hash,
            contractName: this._getContractName(hash, manifest),
            eventName,
            eventDef,
            decodedParams,
            operationType,
            rawState: n.state,
            ...this._extractTransferFields(operationType, decodedParams, hash, manifest),
          };
        });

      const byContract = this._groupByContract(operations);

      const enriched = {
        trigger: exec.trigger ?? "Application",
        vmState: exec.vmstate ?? "UNKNOWN",
        gasConsumed: exec.gasconsumed ?? "0",
        exception: exec.exception ?? null,
        stack: exec.stack ?? [],
        operations,
        byContract,
      };

      if (detailedExec) {
        enriched.steps = detailedExec?.steps ?? detailedExec?.opcodes ?? [];
        enriched.contractCalls = detailedExec?.contractcalls ?? detailedExec?.contractCalls ?? [];
        enriched.storageChanges = detailedExec?.storagechanges ?? detailedExec?.storageChanges ?? [];
      }

      return enriched;
    },

    /**
     * Fetch contract manifests in parallel, collecting partial failures.
     * @private
     * @param {string[]} hashes
     * @returns {Promise<{manifests: Map, failures: Array<{hash: string, error: string}>}>}
     */
    async _fetchManifests(hashes) {
      const manifests = new Map();
      const failures = [];
      const results = await Promise.all(
        hashes.map((h) =>
          contractService.getManifest(h).catch((err) => {
            failures.push({ hash: h, error: err?.message ?? String(err) });
            return null;
          })
        )
      );
      hashes.forEach((h, i) => manifests.set(h, results[i]));

      if (failures.length > 0 && import.meta.env.DEV) {
        console.warn(`[executionService] ${failures.length}/${hashes.length} manifest(s) failed:`, failures);
      }

      return { manifests, failures };
    },

    /** @private */
    _findEventDef(manifest, eventName) {
      if (!manifest?.abi?.events) return null;
      return manifest.abi.events.find((e) => e.name?.toLowerCase() === eventName?.toLowerCase()) ?? null;
    },

    /** @private */
    _classifyOperation(eventName, contractHash) {
      const name = eventName.toLowerCase();
      if (name === "transfer") return "transfer";
      if (name === "deploy" || name === "update" || name === "migrate") return "deploy";
      if (name === "destroy") return "destroy";
      if (name === "vote" || name === "unvote") return "vote";
      if (name === "approval") return "approval";
      if (name === "mint") return "mint";
      if (name === "burn") return "burn";
      if (contractHash.toLowerCase() === CONTRACT_MANAGEMENT_HASH) return "deploy";
      return "custom";
    },

    /** @private */
    _getContractName(hash, manifest) {
      const native = NATIVE_CONTRACTS[hash?.toLowerCase()];
      if (native) return native.name;
      if (manifest?.name) return manifest.name;
      return null;
    },

    /** @private */
    _getTokenDecimals(contractHash, manifest) {
      const native = NATIVE_CONTRACTS[contractHash?.toLowerCase()];
      if (native?.decimals !== undefined) return native.decimals;
      if (manifest?.extra?.decimals !== undefined) return Number(manifest.extra.decimals);
      return 0;
    },

    /** @private */
    _extractTransferFields(operationType, decodedParams, contractHash, manifest) {
      if (operationType !== "transfer" || !Array.isArray(decodedParams) || decodedParams.length < 3) return {};
      const native = NATIVE_CONTRACTS[contractHash?.toLowerCase()];
      const fields = {
        from: decodedParams[0]?.decoded?.decodedValue ?? decodedParams[0]?.displayValue ?? null,
        to: decodedParams[1]?.decoded?.decodedValue ?? decodedParams[1]?.displayValue ?? null,
        amount: decodedParams[2]?.decoded?.decodedValue ?? decodedParams[2]?.displayValue ?? "0",
        tokenSymbol: native?.symbol ?? manifest?.name ?? null,
        tokenDecimals: this._getTokenDecimals(contractHash, manifest),
      };
      if (decodedParams.length >= 4 && decodedParams[3]?.decoded) {
        const rawId = decodedParams[3].decoded.decodedValue ?? decodedParams[3].decoded.displayValue ?? null;
        if (rawId != null && rawId !== "") {
          fields.tokenId = rawId;
        }
      }
      return fields;
    },

    /** @private */
    _groupByContract(operations) {
      const map = new Map();
      for (const op of operations) {
        if (!map.has(op.contract)) {
          map.set(op.contract, { contract: op.contract, contractName: op.contractName, events: [] });
        }
        map.get(op.contract).events.push(op);
      }
      return Array.from(map.values());
    },
  }
);

export default executionService;
