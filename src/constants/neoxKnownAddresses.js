// Neo X (EVM) official-address identity registry.
//
// Evidence-based only: every entry below is confirmed by official Neo X
// documentation and/or verified on-chain source, cross-checked against both
// networks (mainnet chainId 47763 via xexplorer.neo.org, testnet T4 chainId
// 12227332 via xt4scan.ngd.network). Blockscout `metadata`/`public_tags` are
// empty for all of these addresses on both explorers, so this registry is the
// only labeling source. Do NOT add speculative entries (third-party bridged
// tokens, undocumented reserved system slots 0x1212...000a-0011, UUPS
// implementation addresses) without documentary evidence.
//
// Sources:
// - System contracts + stand-by validators:
//   https://xdocs.ngd.network/governance/neo-x-system-contracts
// - Official tokens + developer infrastructure (networks page):
//   https://xdocs.ngd.network/development/networks.md
// - Bridge contract addresses:
//   https://github.com/bane-labs/bridge-evm-contracts
// - Oracle gateway:
//   https://xdocs.ngd.network/integrations/oracles/neo-oracle-gateway
// - Genesis allocation:
//   https://github.com/bane-labs/go-ethereum/tree/bane-main/config
//
// Note: 0x1212...0005 verifies on-chain under the source name "MultisendProxy",
// but official docs and the bane-labs bridge repo both call it BridgeManagement;
// labels follow the official sources.

/**
 * Registry entries.
 * `network`: "both" | "mainnet" | "testnet" (Neo X networks only).
 * `role`: key into NEOX_ROLE_META.
 */
export const NEOX_KNOWN_ADDRESSES = [
  // ── System (pre-compiled genesis) contracts — same address on both networks ──
  { address: "0x1212000000000000000000000000000000000000", network: "both", label: "GovProxyAdmin", role: "governance" },
  { address: "0x1212000000000000000000000000000000000001", network: "both", label: "Governance", role: "governance" },
  { address: "0x1212000000000000000000000000000000000002", network: "both", label: "Policy", role: "governance" },
  { address: "0x1212000000000000000000000000000000000003", network: "both", label: "Governance Reward", role: "governance" },
  { address: "0x1212000000000000000000000000000000000004", network: "both", label: "Neo X Bridge (TokenBridge)", role: "bridge" },
  { address: "0x1212000000000000000000000000000000000005", network: "both", label: "Bridge Management", role: "bridge" },
  { address: "0x1212000000000000000000000000000000000006", network: "both", label: "Treasury", role: "infra" },
  { address: "0x1212000000000000000000000000000000000007", network: "both", label: "Committee MultiSig", role: "governance" },
  { address: "0x1212000000000000000000000000000000000008", network: "both", label: "Key Management (Anti-MEV DKG)", role: "infra" },
  { address: "0x1212000000000000000000000000000000000009", network: "both", label: "Message Bridge", role: "bridge" },
  { address: "0x85776439bbE26A3B6F91baB0fb8Ef3fDc769f385", network: "both", label: "Bridge Execution Manager", role: "bridge" },

  // ── Official tokens ──
  { address: "0xdE41591ED1f8ED1484aC2CD8ca0876428de60EfF", network: "mainnet", label: "Wrapped GAS (WGAS10)", role: "token" },
  { address: "0x1CE16390FD09040486221e912B87551E4e44Ab17", network: "testnet", label: "Wrapped GAS (WGAS10)", role: "token" },
  { address: "0x9a50C8804dC885F118835cD96d3Ea4D4A5131A01", network: "mainnet", label: "Extended GAS (xGAS)", role: "token" },
  { address: "0x3eE9da67D85475a250423138cBf56aF511277958", network: "testnet", label: "Extended GAS (xGAS)", role: "token" },

  // ── Oracle ──
  { address: "0xce6138E61e5727a318D0DebEaD99Aff24B929131", network: "both", label: "Neo Oracle Gateway Proxy", role: "oracle" },
  { address: "0x8B506d2616671b6742b968C18bEFdA1e665A9025", network: "mainnet", label: "Supra Pull Oracle", role: "oracle" },
  { address: "0xc99c8510D9FF355CD664F9412bdD645c5e25a7f1", network: "testnet", label: "Supra Pull Oracle", role: "oracle" },
  { address: "0x58e158c74DF7Ad6396C0dcbadc4878faC9e93d57", network: "mainnet", label: "Supra Oracle Storage", role: "oracle" },
  { address: "0x5df499C9DB456154F81121282c0cB16b59e74C4b", network: "testnet", label: "Supra Oracle Storage", role: "oracle" },
  { address: "0xBB0f96cede5728D69409340be459A864478e9222", network: "mainnet", label: "Supra wBTC/USDT Feed", role: "oracle" },
  { address: "0xd6869E35e568Aa6BF481Fda57ac38f7353AF596F", network: "mainnet", label: "Supra WETH/USDT Feed", role: "oracle" },
  { address: "0x8fd2622c2CA0d7f8Bd0e2Ee98B143213dBcF4975", network: "mainnet", label: "Supra NEO/USDT Feed", role: "oracle" },
  { address: "0xe38231C17771f02fEE44B5275B3625Bf67817120", network: "mainnet", label: "Supra GAS/USDT Feed", role: "oracle" },
  { address: "0x99f4800f8958Caf403688b988f683188dF36CEaF", network: "testnet", label: "Supra wBTC/USDT Feed", role: "oracle" },
  { address: "0xB29f673C3bA1657b2F0ef160dD60425deB67BD38", network: "testnet", label: "Supra WETH/USDT Feed", role: "oracle" },
  { address: "0xe027fE13ae0a9d302A1338b861de64EBb9c6b1b1", network: "testnet", label: "Supra NEO/USDT Feed", role: "oracle" },
  { address: "0xE7d292a336c15ab80A51E9b6959b5Ec9eA870474", network: "testnet", label: "Supra GAS/USDT Feed", role: "oracle" },

  // ── Developer infrastructure ──
  { address: "0xD6010D102015fEa9cB3a9AbFBB51994c0Fd6E672", network: "mainnet", label: "Multicall3", role: "infra" },
  { address: "0x82096F92248dF7afDdef72E545F06e5be0cf0F99", network: "testnet", label: "Multicall3", role: "infra" },
  { address: "0x4e59b44847b379578588920cA78FbF26c0B4956C", network: "both", label: "CREATE2 Deployer", role: "infra" },
  { address: "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed", network: "both", label: "CreateX Factory", role: "infra" },
  { address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", network: "both", label: "ERC-4337 EntryPoint v0.6", role: "infra" },
  { address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", network: "both", label: "ERC-4337 EntryPoint v0.7", role: "infra" },
  { address: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108", network: "both", label: "ERC-4337 EntryPoint v0.8", role: "infra" },
  { address: "0x433709009B8330FDa32311DF1C2AFA402eD8D009", network: "both", label: "ERC-4337 EntryPoint v0.9", role: "infra" },

  // ── Stand-by consensus validators (fallback consensus set; EOAs) ──
  { address: "0x34a3b2aBB99B4C128acf61dCBBd1FcAC0B161652", network: "mainnet", label: "Stand-by Validator 1", role: "validator" },
  { address: "0x641ec1c538Fa17E6aD8193c9b580f6850b114280", network: "mainnet", label: "Stand-by Validator 2", role: "validator" },
  { address: "0xe3973F57e8a0Aa312C1917aB0e6a05D8b6aF6609", network: "mainnet", label: "Stand-by Validator 3", role: "validator" },
  { address: "0xa61aC4a4f006F4FcEeb72Ee0012a2D3367168D10", network: "mainnet", label: "Stand-by Validator 4", role: "validator" },
  { address: "0xe6D1A9Db6A0893926BD81c0EF93AAAa543C116F0", network: "mainnet", label: "Stand-by Validator 5", role: "validator" },
  { address: "0x4FE8af0dBb633283D8e9703668142Fd130F2818d", network: "mainnet", label: "Stand-by Validator 6", role: "validator" },
  { address: "0x763452F65353FffE73D46539e51a6DdfC0e2c86A", network: "mainnet", label: "Stand-by Validator 7", role: "validator" },
  { address: "0xcBBECa26e89011E32BA25610520B20741b809007", network: "testnet", label: "Stand-by Validator 1", role: "validator" },
  { address: "0x4Ea2A4697D40247C8Be1F2B9ffa03a0E92DCbACC", network: "testnet", label: "Stand-by Validator 2", role: "validator" },
  { address: "0xD10f47396dc6c76aD53546158751582D3E2683ef", network: "testnet", label: "Stand-by Validator 3", role: "validator" },
  { address: "0xa51fE05B0183D01607bf48C1718D1168a1c11171", network: "testnet", label: "Stand-by Validator 4", role: "validator" },
  { address: "0x01b517B301BB143476Da35bb4A1399500D925514", network: "testnet", label: "Stand-by Validator 5", role: "validator" },
  { address: "0x7976ad987D572377d39FB4bab86C80e08B6F8327", network: "testnet", label: "Stand-by Validator 6", role: "validator" },
  { address: "0xD711DA2D8C71a801fC351163337656F1321343A0", network: "testnet", label: "Stand-by Validator 7", role: "validator" },
];

/** Badge metadata per role tag. */
export const NEOX_ROLE_META = {
  bridge: { label: "Bridge" },
  governance: { label: "Governance" },
  oracle: { label: "Oracle" },
  validator: { label: "Validator" },
  token: { label: "Token" },
  infra: { label: "Infra" },
};

// Per-network lowercase lookup maps, built once at module init. Entries with
// network "both" are inserted into both maps.
const buildMaps = () => {
  const mainnet = new Map();
  const testnet = new Map();
  for (const { address, network, label, role } of NEOX_KNOWN_ADDRESSES) {
    const key = address.toLowerCase();
    const identity = Object.freeze({ label, role });
    if (network === "both" || network === "mainnet") mainnet.set(key, identity);
    if (network === "both" || network === "testnet") testnet.set(key, identity);
  }
  return { mainnet, testnet };
};

const IDENTITY_MAPS = buildMaps();

/**
 * Resolve an official Neo X identity for an address on a given network.
 *
 * @param {string} address - EVM address (any case).
 * @param {string} net - Neo X net id ("neox-mainnet" / "neox-testnet") or bare
 *   "mainnet" / "testnet".
 * @returns {{ label: string, role: string } | null}
 */
export function resolveNeoxIdentity(address, net) {
  const key = String(address || "").trim().toLowerCase();
  if (!key) return null;
  const raw = String(net || "").toLowerCase();
  const map = raw.includes("test") ? IDENTITY_MAPS.testnet : IDENTITY_MAPS.mainnet;
  return map.get(key) || null;
}
