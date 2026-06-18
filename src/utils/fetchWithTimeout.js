import { recordApiObservationFromResponse } from "../telemetry/apiObservability";

export const DEFAULT_FETCH_TIMEOUT_MS = 3000;

export async function fetchWithTimeout(input, init = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const effectiveTimeout = Number(timeoutMs);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const upstreamSignal = init?.signal;
  const fetchInit = { ...(init || {}) };
  let timer = null;

  if (controller) {
    fetchInit.signal = controller.signal;
    if (upstreamSignal?.aborted) {
      controller.abort(upstreamSignal.reason);
    } else if (upstreamSignal?.addEventListener) {
      upstreamSignal.addEventListener("abort", () => controller.abort(upstreamSignal.reason), { once: true });
    }
  }

  if (controller && Number.isFinite(effectiveTimeout) && effectiveTimeout > 0) {
    timer = setTimeout(() => controller.abort(), effectiveTimeout);
  }

  try {
    const response = await fetch(input, fetchInit);
    recordApiObservationFromResponse(response, input, {
      init: fetchInit,
      method: fetchInit.method || "GET",
      source: "fetch",
    });
    return response;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
