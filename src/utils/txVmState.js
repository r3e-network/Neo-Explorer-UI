/**
 * Normalize and extract transaction/app-log VM state across backend payload variants.
 */

/**
 * Convert a raw VM status value into canonical HALT / FAULT / unknown.
 * @param {unknown} value
 * @returns {string} "HALT" | "FAULT" | ""
 */
export function normalizeVmState(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.includes("FAULT") || normalized === "FAILED" || normalized === "FAIL" || normalized === "ERROR") {
    return "FAULT";
  }
  if (normalized.includes("HALT") || normalized === "SUCCESS" || normalized === "SUCCEEDED") {
    return "HALT";
  }
  return "";
}

/**
 * Extract canonical VM state from arbitrary object field variants.
 * @param {Record<string, any> | null | undefined} payload
 * @returns {string} "HALT" | "FAULT" | ""
 */
export function extractVmStateFromObject(payload) {
  if (!payload || typeof payload !== "object") return "";
  return normalizeVmState(
    payload.vmstate ??
      payload.Vmstate ??
      payload.VMState ??
      payload.vmState ??
      payload.execution_state ??
      payload.executionState ??
      payload.tx_state ??
      payload.txState ??
      payload.state ??
      payload.status
  );
}

/**
 * Extract canonical VM state from application log payloads that may be either:
 * - legacy: { executions: [{ vmstate, ... }] }
 * - indexed/flattened: { vmstate, ... }
 * @param {Record<string, any> | null | undefined} appLog
 * @returns {string} "HALT" | "FAULT" | ""
 */
export function extractVmStateFromAppLog(appLog) {
  if (!appLog || typeof appLog !== "object") return "";
  const fromFirstExec = extractVmStateFromObject(appLog.executions?.[0]);
  if (fromFirstExec) return fromFirstExec;
  return extractVmStateFromObject(appLog);
}

