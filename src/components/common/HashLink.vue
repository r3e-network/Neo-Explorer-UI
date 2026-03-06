<template>
  <div class="inline-flex items-center gap-1.5 min-w-0">
    <template v-if="type === 'address'">
      <router-link
        v-if="addressAliasAsPrimary && addressAlias"
        :to="linkPath"
        class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
        :title="normalizedAddressHash || hash"
      >
        <img
          v-if="addressLogo"
          :src="addressLogo"
          class="w-3.5 h-3.5 rounded-full object-cover bg-white"
          :alt="addressAlias"
        />
        <span class="truncate">{{ addressAlias }}</span>
      </router-link>
      <template v-else>
        <router-link
          :to="linkPath"
          class="etherscan-link font-hash truncate text-sm"
          :title="normalizedAddressHash || hash"
        >
          {{ displayHash }}
        </router-link>
        <span
          v-if="addressAlias"
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          :title="addressAlias"
        >
          <img
            v-if="addressLogo"
            :src="addressLogo"
            class="w-3.5 h-3.5 rounded-full object-cover bg-white"
            :alt="addressAlias"
          />
          {{ addressAlias }}
        </span>
      </template>
    </template>

    <template v-else>
      <router-link
        v-if="knownName"
        :to="linkPath"
        class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
        :title="hash"
      >
        <img v-if="knownLogo" :src="knownLogo" class="w-3.5 h-3.5 rounded-full object-cover bg-white" :alt="knownName" />
        {{ knownName }}
      </router-link>

      <router-link
        v-else
        :to="linkPath"
        class="etherscan-link font-hash truncate text-sm"
        :title="hash"
      >
        {{ displayHash }}
      </router-link>
    </template>
    <CopyButton v-if="copyable" :text="copyText" size="sm" class="flex-shrink-0" />
    
    <a 
      v-if="type === 'address' && showNeoChat" 
      :href="`https://chat.neo.org/?to=${hash}`" 
      target="_blank" 
      rel="noopener noreferrer"
      class="flex-shrink-0 transition-transform hover:scale-110"
      title="Chat via NeoChat"
    >
      <img src="@/assets/neochat.svg" class="w-4 h-4" alt="NeoChat" />
    </a>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { truncateHash as truncateHashValue } from "@/utils/explorerFormat";
import CopyButton from "./CopyButton.vue";
import nnsService from "@/services/nnsService";
import { contractService } from "@/services";
import { supabaseService } from "@/services/supabaseService";
import { getKnownAddressLogo, getKnownAddressName } from "@/constants/knownAddresses";
import { GAS_HASH, NATIVE_CONTRACTS, NEO_HASH } from "@/constants/index";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { addressToScriptHash, scriptHashToAddress } from "@/utils/neoHelpers";
import { optimizeLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";

const props = defineProps({
  hash: { type: String, default: "" },
  type: {
    type: String,
    default: "tx",
    validator: (v) => ["tx", "block", "address", "contract", "token"].includes(v),
  },
  tokenStandard: { type: String, default: "" },
  truncate: { type: [Boolean, null], default: null },
  truncated: { type: Boolean, default: true },
  copyable: { type: Boolean, default: true },
  showNeoChat: { type: Boolean, default: false },
  resolveNns: { type: Boolean, default: true },
  addressAliasAsPrimary: { type: Boolean, default: false },
});

const shouldTruncate = computed(() =>
  props.truncate === null ? props.truncated : props.truncate
);

const nnsName = ref("");
const addressMetadata = ref(null);
const candidateMetadata = ref(null);
const fetchedContractName = ref("");
const fetchedContractLogo = ref("");
const DOMAIN_LOGO_URL = "https://neo.link/_next/static/media/nnslogo.1314e9b5.svg";

const normalizeExpirationMs = (raw) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value < 1_000_000_000_000 ? value * 1000 : value;
};

const getActiveDomainFromAddressMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return "";

  const domain = String(metadata.nns_domain || metadata.nnsDomain || "").trim().toLowerCase();
  if (!domain) return "";

  if (domain.endsWith(".matrix")) {
    return domain;
  }

  if (metadata.has_active_nns === true) {
    return domain;
  }

  const expirationMs = normalizeExpirationMs(
    metadata.nns_expiration_ms ??
      metadata.nnsExpirationMS ??
      metadata.nns_expiration ??
      metadata.nnsExpiration
  );

  return expirationMs > Date.now() ? domain : "";
};

const normalizedAddressHash = computed(() => {
  if (props.type !== "address" || !props.hash) return props.hash;
  return scriptHashToAddress(props.hash);
});

const normalizeHash160 = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("0x")) return raw;
  if (/^[0-9a-f]{40}$/.test(raw)) return `0x${raw}`;
  return "";
};

const findCandidateMetadata = async (lookupHash) => {
  const normalizedAddress = String(lookupHash || "").trim();
  if (!normalizedAddress) return null;

  const targetScriptHash = normalizeHash160(addressToScriptHash(normalizedAddress) || normalizedAddress);

  try {
    const validators = await supabaseService.getValidatorMetadata();
    if (!Array.isArray(validators) || validators.length === 0) return null;

    return (
      validators.find((item) => {
        const candidateIdentifier = String(item.address || item.scripthash || "").trim();
        const candidateScriptHash = normalizeHash160(item.scripthash || item.address);
        return candidateIdentifier === normalizedAddress || (targetScriptHash && candidateScriptHash === targetScriptHash);
      }) || null
    );
  } catch (_err) {
    return null;
  }
};

const knownName = computed(() => {
  if (!props.hash) return null;
  if (props.type === "address") {
    return getKnownAddressName(normalizedAddressHash.value) || null;
  }
  if (props.type === "contract" || props.type === "token") {
    const hash = props.hash.toLowerCase();
    const native = NATIVE_CONTRACTS[hash];
    if (native && native.name) return native.name;
    const known = KNOWN_CONTRACTS[hash];
    if (known && known.name) return known.name;
  }
  return fetchedContractName.value || null;
});

const knownLogo = computed(() => {
  if (!props.hash) return null;
  if (props.type === "contract" || props.type === "token") {
    const hash = props.hash.toLowerCase();
    const native = NATIVE_CONTRACTS[hash];

    const isNativeToken = hash === NEO_HASH || hash === GAS_HASH;

    if (native && props.type === "contract" && !isNativeToken) {
      return "/img/brand/neo.png";
    }

    if (fetchedContractLogo.value) return fetchedContractLogo.value;
    const known = KNOWN_CONTRACTS[hash];
    if (known && known.logo) return optimizeLogoUrl(known.logo, { kind: "contract" });
    
    // Auto-detect Flamingo contracts by name if we dynamically fetched it
    if (fetchedContractName.value) {
      const lowerName = fetchedContractName.value.toLowerCase();
      if (lowerName.includes('flamingo')) {
        return optimizeLogoUrl("https://flamingo.finance/favicon.ico", { kind: "contract" });
      }
      if (lowerName.includes('burger')) {
        return optimizeLogoUrl("https://app.neoburger.io/favicon.ico", { kind: "contract" });
      }
    }
  }
  if (fetchedContractLogo.value) return fetchedContractLogo.value;
  return null;
});

const addressDomainAlias = computed(() =>
  props.type === "address" ? getActiveDomainFromAddressMetadata(addressMetadata.value) : ""
);

const addressMetadataAlias = computed(() => {
  if (props.type !== "address") return "";
  const meta = addressMetadata.value;
  if (!meta || typeof meta !== "object") return "";

  const alias = String(meta.display_name || meta.label || "").trim();
  if (!alias) return "";

  const normalized = String(normalizedAddressHash.value || props.hash || "").trim();
  if (alias === normalized) return "";
  return alias;
});

const addressAlias = computed(() => {
  if (props.type !== "address") return "";
  return addressDomainAlias.value || knownName.value || addressMetadataAlias.value || nnsName.value || "";
});

const addressLogo = computed(() => {
  if (props.type !== "address") return "";

  const knownLogo = String(getKnownAddressLogo(normalizedAddressHash.value || props.hash) || "").trim();
  if (knownLogo) {
    return optimizeLogoUrl(knownLogo, { kind: "user" });
  }

  const metadataLogo = String(addressMetadata.value?.logo_url || addressMetadata.value?.logo || "").trim();
  if (metadataLogo) {
    return optimizeLogoUrl(metadataLogo, { kind: "user" });
  }

  const candidateLogo = String(
    candidateMetadata.value?.logo_url || candidateMetadata.value?.logoUrl || candidateMetadata.value?.logo || ""
  ).trim();
  if (candidateLogo) {
    return resolveCandidateLogoUrl(candidateLogo);
  }

  if (addressDomainAlias.value.endsWith(".neo") || addressDomainAlias.value.endsWith(".matrix")) {
    return optimizeLogoUrl(DOMAIN_LOGO_URL, { kind: "user" });
  }

  return "";
});

const copyText = computed(() => {
  if (props.type === "address") {
    return normalizedAddressHash.value || props.hash || "";
  }
  return props.hash || "";
});

watch(
  () => [props.hash, props.type, props.resolveNns],
  async ([newHash, type, resolveNns]) => {
    nnsName.value = "";
    addressMetadata.value = null;
    candidateMetadata.value = null;
    fetchedContractName.value = "";
    fetchedContractLogo.value = "";
    
    const lookupHash = type === "address" ? normalizedAddressHash.value : newHash;

    if (type === "address" && lookupHash) {
      try {
        const metadata = await supabaseService.getAddressTag(lookupHash);
        if (metadata) {
          addressMetadata.value = metadata;
        }
      } catch (_err) {
        // Ignore metadata lookup failure.
      }

      const hasKnownAddressLogo = Boolean(getKnownAddressLogo(lookupHash));
      const hasAddressMetadataLogo = Boolean(
        String(addressMetadata.value?.logo_url || addressMetadata.value?.logo || "").trim()
      );

      if (!hasKnownAddressLogo && !hasAddressMetadataLogo) {
        candidateMetadata.value = await findCandidateMetadata(lookupHash);
      }

      const hasMetadataAlias = Boolean(
        getActiveDomainFromAddressMetadata(addressMetadata.value) ||
          String(addressMetadata.value?.display_name || addressMetadata.value?.label || "").trim()
      );

      if (resolveNns && !knownName.value && !hasMetadataAlias) {
        const res = await nnsService.resolveAddressToNNS(lookupHash);
        if (res && res.nns) {
          nnsName.value = res.nns;
        }
      }
    }

    if ((type === "contract" || type === "token") && newHash && !knownName.value) {
      const hash = newHash.startsWith('0x') ? newHash.toLowerCase() : `0x${newHash.toLowerCase()}`;
      try {
        const cachedMeta = await supabaseService.getContractMetadata(hash);
        if (cachedMeta?.name || cachedMeta?.display_name) {
          fetchedContractName.value = cachedMeta.display_name || cachedMeta.name;
        }
        if (cachedMeta?.logo_url) {
          fetchedContractLogo.value = optimizeLogoUrl(cachedMeta.logo_url, { kind: "contract" });
        }
        if (fetchedContractName.value) {
          return;
        }

        let contract = await contractService.getByHash(hash);
        if (!contract || !contract.name) {
          // Try reversing the hash (endianness fallback)
          const cleanHash = hash.replace(/^0x/i, '');
          const reversed = '0x' + (cleanHash.match(/.{2}/g) || []).reverse().join('');
          const reversedMeta = await supabaseService.getContractMetadata(reversed);
          if (reversedMeta?.name || reversedMeta?.display_name) {
            fetchedContractName.value = reversedMeta.display_name || reversedMeta.name;
          }
          if (reversedMeta?.logo_url) {
            fetchedContractLogo.value = optimizeLogoUrl(reversedMeta.logo_url, { kind: "contract" });
          }
          if (fetchedContractName.value) {
            return;
          }
          contract = await contractService.getByHash(reversed);
        }
        if (contract && contract.name) {
          fetchedContractName.value = contract.name;
        }
      } catch (e) { /* ignore */ }
    }
  },
  { immediate: true }
);

const displayHash = computed(() => {
  if (!props.hash) return "";
  if (props.type === "address") {
    const address = normalizedAddressHash.value || props.hash;
    if (!shouldTruncate.value) return address;
    return truncateHashValue(address, 8, 6);
  }
  if (fetchedContractName.value) return fetchedContractName.value;
  if (!shouldTruncate.value) return props.hash;
  return truncateHashValue(props.hash, 8, 6);
});

const linkPath = computed(() => {
  const isNep11 = /nep[-_]?11/i.test(props.tokenStandard);
  const routes = {
    block: `/block-info/${props.hash}`,
    tx: `/transaction-info/${props.hash}`,
    address: `/account-profile/${normalizedAddressHash.value || props.hash}`,
    contract: `/contract-info/${props.hash}`,
    token: isNep11 ? `/nft-token-info/${props.hash}` : `/nep17-token-info/${props.hash}`,
  };
  return routes[props.type] || routes.tx;
});
</script>
