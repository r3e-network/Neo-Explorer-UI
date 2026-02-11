import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { contractService } from "./contractService";
import { NATIVE_CONTRACTS, CONTRACT_MANAGEMENT_HASH } from "@/constants";
import { decodeNotificationParams } from "@/utils/neoCodec";

/**
 * Execution Service - Neo3 交易执行追踪
 * @module services/executionService
 * @description 解析应用日志，构建合约调用树，解码通知事件
 */
export const executionService = {
  /**
   * 获取交易执行追踪（带缓存，确认后不可变）
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object|null>} 应用日志数据
   */
  async getExecutionTrace(txHash) {
    const key = getCacheKey("exec_trace", { txHash });
    return cachedRequest(key, () => safeRpc("GetApplicationLog", { TransactionHash: txHash }, null), CACHE_TTL.trace);
  },

  /**
   * 判断是否为复杂交易（多合约通知或嵌套调用）
   * @param {Object} appLog - 应用日志对象
   * @returns {boolean} 是否复杂交易
   */
  isComplexTransaction(appLog) {
    if (!appLog) return false;

    const executions = appLog.executions ?? [];
    // Multiple execution triggers = complex
    if (executions.length > 1) return true;

    for (const exec of executions) {
      // FAULT transactions are always worth investigating
      if (exec.vmstate === "FAULT") return true;

      const notifications = exec.notifications ?? [];
      // No notifications = simple
      if (notifications.length === 0) continue;
      // Multiple notifications = complex
      if (notifications.length > 1) return true;

      // Single notification: only simple if it's a Transfer
      const singleName = (notifications[0].eventname ?? "").toLowerCase();
      if (singleName !== "transfer") return true;
    }

    return false;
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

      // 按合约分组通知
      const contractMap = new Map();
      for (const notification of notifications) {
        const hash = notification.contract ?? "unknown";
        if (!contractMap.has(hash)) {
          contractMap.set(hash, {
            contract: hash,
            events: [],
          });
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
   * Get enriched execution trace with decoded params and contract metadata.
   * @param {string} txHash
   * @returns {Promise<Object|null>} Enriched trace data
   */
  async getEnrichedTrace(txHash) {
    const appLog = await this.getExecutionTrace(txHash);
    if (!appLog) return null;

    const executions = appLog.executions ?? [];
    // Collect unique contract hashes
    const contractHashes = new Set();
    for (const exec of executions) {
      for (const n of exec.notifications ?? []) {
        if (n != null && n.contract) contractHashes.add(n.contract);
      }
    }

    // Batch-fetch manifests in parallel (all cached)
    const manifestMap = await this._fetchManifests([...contractHashes]);

    // Build enriched executions
    const enrichedExecutions = executions.map((exec) => this._enrichExecution(exec, manifestMap));

    // Extract all transfer operations across executions
    const transfers = enrichedExecutions.flatMap((e) =>
      (e.operations ?? []).filter((op) => op.operationType === "transfer")
    );

    return {
      raw: appLog,
      executions: enrichedExecutions,
      transfers,
      contractMetadata: manifestMap,
      isComplex: this.isComplexTransaction(appLog),
    };
  },

  /**
   * Enrich a single execution with decoded notifications.
   * @private
   */
  _enrichExecution(exec, manifestMap) {
    const notifications = exec.notifications ?? [];
    const operations = notifications
      .filter((n) => n != null)
      .map((n, i) => {
        const hash = n.contract ?? "unknown";
        const eventName = n.eventname ?? "unknown";
        const manifest = manifestMap.get(hash);
        const eventDef = this._findEventDef(manifest, eventName);
        const decodedParams = decodeNotificationParams(n.state, eventDef);
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
          // For transfer ops, extract from/to/amount
          ...this._extractTransferFields(operationType, decodedParams, hash, manifest),
        };
      });

    // Group by contract for call map
    const byContract = this._groupByContract(operations);

    return {
      trigger: exec.trigger ?? "Application",
      vmState: exec.vmstate ?? "UNKNOWN",
      gasConsumed: exec.gasconsumed ?? "0",
      stack: exec.stack ?? [],
      operations,
      byContract,
    };
  },

  /**
   * Batch-fetch manifests for a list of contract hashes.
   * @private
   * @returns {Promise<Map<string, Object|null>>}
   */
  async _fetchManifests(hashes) {
    const map = new Map();
    const results = await Promise.all(hashes.map((h) => contractService.getManifest(h).catch(() => null)));
    hashes.forEach((h, i) => map.set(h, results[i]));
    return map;
  },

  /**
   * Find an ABI event definition by name from a manifest.
   * @private
   */
  _findEventDef(manifest, eventName) {
    if (!manifest) return null;
    if (!manifest.abi?.events) return null;
    return manifest.abi.events.find((e) => e.name?.toLowerCase() === eventName?.toLowerCase()) ?? null;
  },

  /**
   * Classify an operation type from event name and contract hash.
   * @private
   */
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

  /**
   * Get display name for a contract hash.
   * @private
   */
  _getContractName(hash, manifest) {
    const native = NATIVE_CONTRACTS[hash?.toLowerCase()];
    if (native) return native.name;
    if (manifest?.name) return manifest.name;
    return null;
  },

  /**
   * Extract from/to/amount fields for transfer operations.
   * @private
   */
  /**
   * Resolve token decimals from native contracts, manifest extra, or default to 0.
   * @private
   */
  _getTokenDecimals(contractHash, manifest) {
    const native = NATIVE_CONTRACTS[contractHash?.toLowerCase()];
    if (native?.decimals !== undefined) return native.decimals;
    // Some APIs / manifests include decimals in the extra field
    if (manifest?.extra?.decimals !== undefined) return Number(manifest.extra.decimals);
    // Default: 0 (safest for display — shows raw integer)
    return 0;
  },

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
    // NEP-11 transfers have a 4th param: tokenId
    if (decodedParams.length >= 4 && decodedParams[3]?.decoded) {
      const rawId = decodedParams[3].decoded.decodedValue ?? decodedParams[3].decoded.displayValue ?? null;
      if (rawId != null && rawId !== "") {
        fields.tokenId = rawId;
      }
    }
    return fields;
  },

  /**
   * Group operations by contract hash.
   * @private
   */
  _groupByContract(operations) {
    const map = new Map();
    for (const op of operations) {
      if (!map.has(op.contract)) {
        map.set(op.contract, {
          contract: op.contract,
          contractName: op.contractName,
          events: [],
        });
      }
      map.get(op.contract).events.push(op);
    }
    return Array.from(map.values());
  },
};

export default executionService;
