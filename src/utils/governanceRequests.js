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

const extractTargetContractHashes = (request) => {
  const requestLevelTargets = Array.isArray(request?.params?.target_contracts)
    ? request.params.target_contracts
    : [];
  const metadataTargets = Array.isArray(request?.metadata?.target_contracts)
    ? request.metadata.target_contracts
    : [];
  const chainedInvocationTargets = Array.isArray(request?.params) ? request.params : [];
  const nestedInvocationTargets = Array.isArray(request?.params?.invocations) ? request.params.invocations : [];

  return [
    ...requestLevelTargets.map((value) => (typeof value === "string" ? value : value?.hash || value?.contract)),
    ...metadataTargets.map((value) => (typeof value === "string" ? value : value?.hash || value?.contract)),
    ...chainedInvocationTargets.map((value) => value?.contract || value?.contract_hash || value?.target_contract),
    ...nestedInvocationTargets.map((value) => value?.contract || value?.contract_hash || value?.target_contract),
  ]
    .map(normalizeContractHash)
    .filter(Boolean);
};

export const isGovernanceRequest = (request, nativeContracts = {}) => {
  if (!request || typeof request !== "object") return false;
  if (String(request.type || "").trim().toLowerCase() === "governance") return true;

  const invocations = Array.isArray(request.params?.invocations) ? request.params.invocations : [];
  if (invocations.length > 0) return true;

  if (String(request.params?.governance_mode || "").trim()) return true;

  const targetContracts = extractTargetContractHashes(request);
  if (targetContracts.length > 0) {
    const nativeHashes = getCandidateNativeHashes(nativeContracts);
    return targetContracts.some((hash) => nativeHashes.includes(hash));
  }

  const targetContract = normalizeContractHash(request.target_contract || request.targetContract);
  if (!targetContract) return false;

  return getCandidateNativeHashes(nativeContracts).includes(targetContract);
};

export const isOffchainReviewPacket = (request) => Boolean(request?.metadata?.offchain_packet_only);

export const getStoredSignatureCount = (request) => {
  const explicitCount = Array.isArray(request?.signatures) ? request.signatures.length : 0;
  if (explicitCount > 0) return explicitCount;

  const metadataCount = Number(request?.metadata?.signatures_collected || 0);
  return Number.isFinite(metadataCount) && metadataCount > 0 ? metadataCount : 0;
};

export const getRequiredSignatureCount = (request) => {
  const explicitCount = Number(request?.signers_required || 0);
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount;

  const metadataCount = Number(request?.metadata?.signatures_needed || 0);
  return Number.isFinite(metadataCount) && metadataCount > 0 ? metadataCount : 0;
};

export const resolveCommitteePubkeys = (request, liveCommitteePubkeys = []) => {
  const isOfficial = String(request?.params?.governance_mode || "").trim().toLowerCase() === "official";
  if (isOfficial && Array.isArray(liveCommitteePubkeys) && liveCommitteePubkeys.length > 0) {
    return liveCommitteePubkeys;
  }

  if (Array.isArray(request?.params?.committee_pubkeys) && request.params.committee_pubkeys.length > 0) {
    return request.params.committee_pubkeys;
  }

  if (Array.isArray(request?.params?.committee) && request.params.committee.length > 0) {
    return request.params.committee;
  }

  if (Array.isArray(request?.params?.pubkeys) && request.params.pubkeys.length > 0) {
    return request.params.pubkeys;
  }

  return [];
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
