import { rpc } from "@/services/api";
import { buildContractParam } from "@/utils/contractParam";
import { resolveNetworkName } from "@/utils/env";

export { buildContractParam } from "@/utils/contractParam";

export async function invokeContractFunction(contractHash, methodName, rawParams = [], signers = null, options = {}) {
  const contractParams = rawParams.map((item) => buildContractParam(item?.type, item?.value));
  const rpcParams = [contractHash, methodName, contractParams];
  if (Array.isArray(signers) && signers.length > 0) rpcParams.push(signers);
  return rpc("invokefunction", rpcParams, { network: resolveNetworkName(options.network) });
}
