import { normalizeVmState } from "./txVmState";

function normalizeReason(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 500) return text;
  return `${text.slice(0, 500)}...`;
}

export function extractFailureReasonFromAppLog(appLog) {
  if (!appLog || typeof appLog !== "object") return "";

  const executions = Array.isArray(appLog.executions) ? appLog.executions : [];
  for (const exec of executions) {
    const state = normalizeVmState(exec?.vmstate ?? exec?.state);
    if (state !== "FAULT") continue;

    const reason =
      normalizeReason(exec?.exception) ||
      normalizeReason(exec?.error) ||
      normalizeReason(exec?.message);
    if (reason) return reason;
  }

  const topState = normalizeVmState(appLog.vmstate ?? appLog.state);
  if (topState === "FAULT" || executions.length === 0) {
    return (
      normalizeReason(appLog.exception) ||
      normalizeReason(appLog.error) ||
      normalizeReason(appLog.message)
    );
  }

  return "";
}

export default extractFailureReasonFromAppLog;
