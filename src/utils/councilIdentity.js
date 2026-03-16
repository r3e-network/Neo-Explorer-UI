import { getKnownAddressLogo, getKnownAddressName } from "@/constants/knownAddresses";
import { addressToScriptHash, publicKeyToAddress, scriptHashToAddress } from "@/utils/neoHelpers";

const normalizeKey = (value) => String(value || "").trim().toLowerCase();

function registerIdentity(map, key, payload) {
  const normalized = normalizeKey(key);
  if (!normalized) return;
  map.set(normalized, payload);
}

export function buildCouncilIdentityMap(rows = []) {
  const identityMap = new Map();

  for (const item of Array.isArray(rows) ? rows : []) {
    const payload = {
      name: String(item?.display_name || item?.name || "").trim(),
      logo: String(item?.logo_url || item?.logoUrl || item?.logo || "").trim(),
    };

    const address = String(item?.address || item?.scripthash || "").trim();
    if (address) {
      registerIdentity(identityMap, address, payload);
      registerIdentity(identityMap, addressToScriptHash(address), payload);
      registerIdentity(identityMap, scriptHashToAddress(address), payload);
    }

    const pubkey = String(item?.public_key || item?.pubkey || item?.publicKey || "").trim();
    if (pubkey) {
      try {
        const derivedAddress = publicKeyToAddress(pubkey);
        registerIdentity(identityMap, derivedAddress, payload);
        registerIdentity(identityMap, addressToScriptHash(derivedAddress), payload);
      } catch {
        // Ignore invalid public keys in metadata rows.
      }
    }
  }

  return identityMap;
}

export function resolveCouncilIdentity(address, identityMap = new Map()) {
  const fallbackAddress = String(address || "").trim();
  const knownName = getKnownAddressName(fallbackAddress) || "";
  const knownLogo = getKnownAddressLogo(fallbackAddress) || "";
  const direct = identityMap.get(normalizeKey(fallbackAddress)) || null;

  return {
    address: fallbackAddress,
    name: String(direct?.name || knownName || fallbackAddress).trim(),
    logo: String(direct?.logo || knownLogo || "").trim(),
  };
}

