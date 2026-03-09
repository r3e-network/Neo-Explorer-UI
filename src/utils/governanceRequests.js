import { toNetworkMode } from "./rpcEndpoints";

const normalizeContractHash = (value) => String(value || "").trim().toLowerCase().replace(/^0x/, "");

const getCandidateNativeHashes = (nativeContracts = {}) => {
  const valueHashes = Object.values(nativeContracts)
    .filter((value) => typeof value === "string")
    .map(normalizeContractHash);

  const keyHashes = Object.entries(nativeContracts)
    .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
    .map(([key]) => normalizeContractHash(key));

  return [...new Set([...valueHashes, ...keyHashes].filter(Boolean))];
};

export const isGovernanceRequest = (request, nativeContracts = {}) => {
  if (!request || typeof request !== "object") return false;
  if (String(request.type || "").trim().toLowerCase() === "governance") return true;

  const targetContract = normalizeContractHash(request.target_contract || request.targetContract);
  if (!targetContract) return false;

  return getCandidateNativeHashes(nativeContracts).includes(targetContract);
};

export const getRequestNetwork = (request, fallbackNetwork = "mainnet") => {
  if (!request || typeof request !== "object") return toNetworkMode(fallbackNetwork);

  const rawNetwork =
    request.network ??
    request.networkMode ??
    request.network_mode ??
    request.params?.network ??
    fallbackNetwork;

  return toNetworkMode(rawNetwork || fallbackNetwork);
};

export const matchesRequestNetwork = (request, activeNetwork = "mainnet") =>
  getRequestNetwork(request, activeNetwork) === toNetworkMode(activeNetwork);
