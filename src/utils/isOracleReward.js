import { getCurrentEnv, NET_ENV } from "./env";
import { NULL_TX_HASH } from "@/constants";

const validateAddressConfig = {
  [NET_ENV.Mainnet]: [
    "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    "0xcb4426a0592481b6133a0a95ff49846e9b9bb431",
    "0x653d7796269ebfa14b632f9a7f09560868d9f646",
    "0x4362251333904b780d5301477f911cea22e477b5",
  ],
  [NET_ENV.TestT5]: [
    "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    "0xcb4426a0592481b6133a0a95ff49846e9b9bb431",
    "0x4362251333904b780d5301477f911cea22e477b5",
    "0x3a82e6e0a196e5dd6138820aa87c8be5495d7f88",
  ],
};

const ORACLE_REWARD_AMOUNT = "10000000";

const isOracleReward = (item) => {
  if (!item || typeof item !== "object") return false;
  const currentEnv = getCurrentEnv();
  const validateList = validateAddressConfig[currentEnv];
  if (!validateList) return false;
  return (
    item.txid === NULL_TX_HASH &&
    item.from === null &&
    item.value === ORACLE_REWARD_AMOUNT &&
    validateList.includes(item.to)
  );
};

export default isOracleReward;
