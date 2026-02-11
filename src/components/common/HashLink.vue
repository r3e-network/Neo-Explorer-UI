<template>
  <div class="inline-flex items-center gap-1.5">
    <router-link
      :to="linkPath"
      class="font-mono text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
      :title="hash"
    >
      {{ displayHash }}
    </router-link>
    <CopyButton v-if="copyable" :text="hash" size="sm" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { truncateHash as truncate } from "@/utils/explorerFormat";
import CopyButton from "./CopyButton.vue";

const props = defineProps({
  hash: { type: String, default: "" },
  type: {
    type: String,
    default: "tx",
    validator: (v) => ["tx", "block", "address", "contract", "token"].includes(v),
  },
  tokenStandard: { type: String, default: "" },
  truncated: { type: Boolean, default: true },
  copyable: { type: Boolean, default: true },
});

const displayHash = computed(() => {
  if (!props.hash) return "";
  if (!props.truncated) return props.hash;
  return truncate(props.hash, 8, 6);
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
