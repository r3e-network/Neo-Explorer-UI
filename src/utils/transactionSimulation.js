import { extractVmStateFromObject } from "@/utils/txVmState";

const MAX_DETAIL_LENGTH = 800;

function cleanText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}...` : text;
}

function getGasConsumed(payload) {
  return cleanText(payload?.gasconsumed ?? payload?.gas_consumed ?? payload?.gasConsumed);
}

function getException(payload) {
  return cleanText(
    payload?.exception ??
      payload?.error ??
      payload?.message ??
      payload?.fault ??
      payload?.details
  );
}

function classifyFailure(text) {
  const lower = String(text || "").toLowerCase();
  if (/(reject|rejected|cancel|cancelled|canceled|denied)/.test(lower)) return "user_rejected";
  if (/(checkwitness|witness|signer|signature|verification|unauthori[sz]ed|permission)/.test(lower)) return "signer";
  if (/(balance|insufficient|not enough|gas|fund|fee)/.test(lower)) return "balance";
  if (/(network|timeout|timed out|unreachable|failed to fetch|rpc|connection)/.test(lower)) return "network";
  if (/(method|manifest|parameter|argument|opcode|contract|abort)/.test(lower)) return "contract";
  return "unknown";
}

function titleFor(category, fromSimulation) {
  if (category === "user_rejected") return "Wallet request was rejected";
  if (category === "network") return fromSimulation ? "Simulation could not reach the network" : "Wallet or RPC request failed";
  return fromSimulation ? "Simulation failed before wallet signing" : "Transaction request failed";
}

function actionFor(category) {
  switch (category) {
    case "balance":
      return "Check the sender balance and transfer amount, then try again.";
    case "signer":
      return "Confirm the connected wallet account and signer scope match what this contract expects.";
    case "user_rejected":
      return "Open the wallet prompt again when you are ready to sign.";
    case "network":
      return "Check the selected network and RPC connectivity, then retry.";
    case "contract":
      return "Review the method name and parameters against the contract manifest.";
    default:
      return "Review the exception details and contract parameters before retrying.";
  }
}

export function isSimulationFault(result) {
  return extractVmStateFromObject(result) === "FAULT";
}

export function explainTransactionSimulation(result, context = {}) {
  const state = extractVmStateFromObject(result);
  const gasConsumed = getGasConsumed(result);
  const details = getException(result);
  const category = state === "FAULT" ? classifyFailure(details) : "ok";

  if (state !== "FAULT") {
    return {
      ok: true,
      severity: "success",
      category,
      state: state || "",
      title: "Simulation passed",
      summary: "Preflight simulation passed.",
      action: "",
      details,
      gasConsumed,
      operation: context.operation || "",
    };
  }

  return {
    ok: false,
    severity: category === "user_rejected" ? "warning" : "error",
    category,
    state,
    title: titleFor(category, true),
    summary: details ? `Simulation failed: ${details}` : "Simulation failed before wallet signing.",
    action: actionFor(category),
    details,
    gasConsumed,
    operation: context.operation || "",
  };
}

export function explainTransactionError(error, context = {}) {
  if (error?.simulationExplanation) return error.simulationExplanation;
  if (error?.invokeResult) return explainTransactionSimulation(error.invokeResult, context);

  const details = cleanText(error?.message || error?.reason || error?.error || error);
  const category = classifyFailure(details);
  return {
    ok: false,
    severity: category === "user_rejected" ? "warning" : "error",
    category,
    state: "",
    title: titleFor(category, false),
    summary: details || "Transaction request failed.",
    action: actionFor(category),
    details,
    gasConsumed: "",
    operation: context.operation || "",
  };
}

export function createSimulationFaultError(invokeResult, context = {}) {
  const explanation = explainTransactionSimulation(invokeResult, context);
  const err = new Error(explanation.summary || "Simulation failed before wallet signing.");
  err.name = "TransactionSimulationError";
  err.invokeResult = invokeResult;
  err.simulationExplanation = explanation;
  return err;
}
