<template>
  <div class="inline-flex items-center gap-1.5 min-w-0">
    <!-- Known Address Badge -->
    <router-link
      v-if="knownName"
      :to="linkPath"
      class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
      :title="hash"
    >
      <img v-if="knownLogo" :src="knownLogo" class="w-3.5 h-3.5 rounded-full object-cover bg-white" alt="" />
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
    <CopyButton v-if="copyable" :text="hash" size="sm" class="flex-shrink-0" />
    
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
import { KNOWN_ADDRESSES } from "@/constants/knownAddresses";
import { NATIVE_CONTRACTS } from "@/constants/index";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";

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
});

const shouldTruncate = computed(() =>
  props.truncate === null ? props.truncated : props.truncate
);

const nnsName = ref("");

const knownName = computed(() => {
  if (!props.hash) return null;
  if (props.type === "address") {
    return KNOWN_ADDRESSES[props.hash] || null;
  }
  if (props.type === "contract" || props.type === "token") {
    const hash = props.hash.toLowerCase();
    const native = NATIVE_CONTRACTS[hash];
    if (native && native.name) return native.name;
    const known = KNOWN_CONTRACTS[hash];
    if (known && known.name) return known.name;
  }
  return null;
});

const knownLogo = computed(() => {
  if (!props.hash) return null;
  if (props.type === "contract" || props.type === "token") {
    const hash = props.hash.toLowerCase();
    const known = KNOWN_CONTRACTS[hash];
    if (known && known.logo) return known.logo;
  }
  return null;
});

watch(
  () => [props.hash, props.type, props.resolveNns],
  async ([newHash, type, resolveNns]) => {
    nnsName.value = "";
    if (resolveNns && type === "address" && newHash && !knownName.value) {
      const res = await nnsService.resolveAddressToNNS(newHash);
      if (res && res.nns) {
        nnsName.value = res.nns;
      }
    }
  },
  { immediate: true }
);

const displayHash = computed(() => {
  if (!props.hash) return "";
  if (nnsName.value) return nnsName.value;
  if (!shouldTruncate.value) return props.hash;
  return truncateHashValue(props.hash, 8, 6);
});

const linkPath = computed(() => {
  const isNep11 = /nep[-_]?11/i.test(props.tokenStandard);
  const routes = {
    block: `/block-info/${props.hash}`,
    tx: `/transaction-info/${props.hash}`,
    address: `/account-profile/${props.hash}`,
    contract: `/contract-info/${props.hash}`,
    token: isNep11 ? `/nft-token-info/${props.hash}` : `/nep17-token-info/${props.hash}`,
  };
  return routes[props.type] || routes.tx;
});
</script>
