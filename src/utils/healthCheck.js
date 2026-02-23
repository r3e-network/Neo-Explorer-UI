import axios from "axios";
import { NET_ENV, setActiveBasePath } from "./env";

let checked = {
  [NET_ENV.Mainnet]: false,
  [NET_ENV.TestT5]: false
};

const checkEndpointHeight = async (url) => {
  try {
    const res = await axios.post(url, {
      jsonrpc: "2.0",
      id: 1,
      method: "GetBlockCount",
      params: {}
    }, { timeout: 5000 });
    
    const result = res.data?.result;
    if (typeof result === 'object' && result !== null) {
      return Number(result.index || result.count || 0);
    }
    return Number(result || 0);
  } catch (e) {
    return -1;
  }
};

export const checkAndSetEndpoints = async () => {
  const networks = [
    { env: NET_ENV.Mainnet, prefix: "/api/mainnet" },
    { env: NET_ENV.TestT5, prefix: "/api/testnet" }
  ];

  const checks = networks.map(async (net) => {
    if (checked[net.env]) return;
    checked[net.env] = true;

    try {
      const [primaryHeight, fallbackHeight] = await Promise.all([
        checkEndpointHeight(`${net.prefix}/primary`),
        checkEndpointHeight(`${net.prefix}/fallback`)
      ]);

      if (primaryHeight === -1 && fallbackHeight === -1) {
        // Both failed, default to primary
        setActiveBasePath(net.env, `${net.prefix}/primary`);
      } else if (fallbackHeight - primaryHeight > 5) {
        setActiveBasePath(net.env, `${net.prefix}/fallback`);
        console.info(`[HealthCheck] ${net.env} using fallback. Primary: ${primaryHeight}, Fallback: ${fallbackHeight}`);
      } else {
        setActiveBasePath(net.env, `${net.prefix}/primary`);
        console.info(`[HealthCheck] ${net.env} using primary. Primary: ${primaryHeight}, Fallback: ${fallbackHeight}`);
      }
    } catch (e) {
      console.warn(`[HealthCheck] Failed for ${net.env}`, e);
    }
  });

  // Wait for checks to complete
  await Promise.all(checks);
};