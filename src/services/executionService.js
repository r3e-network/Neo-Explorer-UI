import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

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
    for (const exec of executions) {
      const notifications = exec.notifications ?? [];
      if (notifications.length > 1) return true;

      // 检查是否有嵌套调用（多个不同合约）
      const contracts = new Set(notifications.map((n) => n.contract));
      if (contracts.size > 1) return true;
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
};

export default executionService;
