import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { resolveNetworkName } from "@/utils/env";

const RADAR_API_TIMEOUT_MS = 8500;
const DEFAULT_DIRECT_LIMIT = 80;
const DEFAULT_PATH_DEPTH = 3;

class AddressRadarError extends Error {
  constructor(message, { status = 0, payload = null } = {}) {
    super(message);
    this.name = "AddressRadarError";
    this.status = status;
    this.payload = payload;
  }
}

function appendParam(params, key, value) {
  if (value === undefined || value === null || value === "") return;
  params.set(key, String(value));
}

async function fetchRadarApi(params, { signal } = {}) {
  const url = `/api/address-radar?${params.toString()}`;
  const response = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
    RADAR_API_TIMEOUT_MS,
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AddressRadarError(payload?.error || `Address radar request failed with ${response.status}`, {
      status: response.status,
      payload,
    });
  }
  if (!payload?.data) {
    throw new AddressRadarError("Address radar API returned an invalid payload.", {
      status: response.status,
      payload,
    });
  }
  return payload?.data || payload || {};
}

export const addressRadarService = {
  async getDirectGraph(address, { limit = DEFAULT_DIRECT_LIMIT, network = null, forceRefresh = false, signal } = {}) {
    const params = new URLSearchParams({
      mode: "direct",
      network: resolveNetworkName(network),
      address: String(address || "").trim(),
      limit: String(limit || DEFAULT_DIRECT_LIMIT),
    });
    if (forceRefresh) appendParam(params, "_ts", Date.now());
    return fetchRadarApi(params, { signal });
  },

  async findPath(source, target, { depth = DEFAULT_PATH_DEPTH, network = null, signal } = {}) {
    const params = new URLSearchParams({
      mode: "path",
      network: resolveNetworkName(network),
      source: String(source || "").trim(),
      target: String(target || "").trim(),
      depth: String(depth || DEFAULT_PATH_DEPTH),
    });
    return fetchRadarApi(params, { signal });
  },

  isProtectiveError(error) {
    const status = Number(error?.status || 0);
    return status === 400 || status === 408 || status === 413 || status === 429;
  },
};

export { AddressRadarError };

export default addressRadarService;
