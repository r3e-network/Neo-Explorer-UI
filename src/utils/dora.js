import { getCurrentEnv, NET_ENV } from "./env";

const DORA_API_BASE = "https://dora.coz.io/api/v2/neo3";

const toDoraNetwork = (env = getCurrentEnv()) => {
  const normalized = String(env || "").trim().toLowerCase();
  if (normalized === NET_ENV.TestT5.toLowerCase() || normalized.includes("test") || normalized.includes("t5")) {
    return "testnet";
  }
  return "mainnet";
};

export const getDoraCommitteeUrl = (env = getCurrentEnv()) =>
  `${DORA_API_BASE}/${toDoraNetwork(env)}/committee`;

export const getDoraCommitteeCacheKey = (env = getCurrentEnv()) =>
  `dora_metadata_${toDoraNetwork(env)}`;
