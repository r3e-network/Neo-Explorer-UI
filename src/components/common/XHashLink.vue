<template>
  <span v-if="copyable" class="inline-flex min-w-0 items-center gap-1">
    <router-link v-if="to" :to="to" :class="linkClass" :title="titleAttr">
      <span
        v-if="roleDotColor"
        class="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
        :style="{ background: roleDotColor }"
        aria-hidden="true"
      ></span>{{ display }}
    </router-link>
    <span v-else :class="plainClass" :title="titleAttr">
      <span
        v-if="roleDotColor"
        class="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
        :style="{ background: roleDotColor }"
        aria-hidden="true"
      ></span>{{ display }}
    </span>
    <CopyButton :text="value" size="xs" />
  </span>
  <router-link v-else-if="to" :to="to" :class="linkClass" :title="titleAttr">
    <span
      v-if="roleDotColor"
      class="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
      :style="{ background: roleDotColor }"
      aria-hidden="true"
    ></span>{{ display }}
  </router-link>
  <span v-else :class="plainClass" :title="titleAttr">
    <span
      v-if="roleDotColor"
      class="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
      :style="{ background: roleDotColor }"
      aria-hidden="true"
    ></span>{{ display }}
  </span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { shortHash } from "@/utils/neoxFormat";
import { NEOX_ROLE_META, resolveNeoxIdentity } from "@/constants/neoxKnownAddresses";
import { getNeoxNet } from "@/utils/neoxEnv";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";

// Lean, EVM-only link component for /x views. Intentionally separate from the
// deeply N3-coupled HashLink (base58 conversion, NNS, validator lookups) so the
// N3 path is never touched. All targets point into the /x route tree.
// Styling mirrors the N3 HashLink recipes: hashes render as
// `etherscan-link font-hash`, human-readable labels/names as
// `etherscan-link font-medium`; the full hash always sits in `title`.
//
// Display precedence: explicit `name` prop > official identity registry label
// (src/constants/neoxKnownAddresses.js, opt out via :identity="false") >
// `label` prop > truncated hash. Registry hits get a small role-colored dot
// and a "<label> - <hash>" tooltip.
const props = defineProps({
  type: { type: String, default: "address" }, // address | tx | block | token | contract
  hash: { type: [String, Number], default: "" },
  label: { type: String, default: "" },
  // Blockscout rich-address display name; when set it becomes the visible
  // label (hash stays available via the title attribute / copy button).
  name: { type: String, default: "" },
  truncate: { type: Boolean, default: true },
  head: { type: Number, default: 6 },
  tail: { type: Number, default: 4 },
  // Renders the shared CopyButton (size xs) after the link.
  copyable: { type: Boolean, default: false },
  // Set false to skip the official-address registry lookup.
  identity: { type: Boolean, default: true },
});

const IDENTITY_TYPES = new Set(["address", "contract", "token"]);

const value = computed(() => String(props.hash ?? ""));

const currentNet = ref(getNeoxNet());

// Registry lookup is reactive across both prop and Neo X network changes. The curated registry OUTRANKS the
// Blockscout-supplied `name`: official identities (bridge/oracle/governance…)
// must win over generic on-chain names like "ERC1967Proxy".
const registryIdentity = computed(() => {
  if (!props.identity || !IDENTITY_TYPES.has(props.type)) return null;
  return resolveNeoxIdentity(value.value, currentNet.value);
});

const handleNetworkChange = (event) => {
  if (event?.detail?.neoxNet) currentNet.value = event.detail.neoxNet;
};

onMounted(() => window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange));
onBeforeUnmount(() => window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange));

const to = computed(() => {
  const v = value.value;
  if (!v) return null;
  switch (props.type) {
    case "tx":
      return `/x/tx/${v}`;
    case "block":
      return `/x/block-info/${v}`;
    case "token":
      return `/x/token/${v}`;
    case "address":
    case "contract":
      return `/x/address/${v}`;
    default:
      return null;
  }
});

const display = computed(() => {
  if (registryIdentity.value) return registryIdentity.value.label;
  if (props.name) return props.name;
  if (props.label) return props.label;
  return props.truncate ? shortHash(value.value, props.head, props.tail) : value.value;
});

const roleDotColor = computed(() => {
  const identity = registryIdentity.value;
  if (!identity) return null;
  return NEOX_ROLE_META[identity.role]?.accent || NEOX_ROLE_META.infra.accent;
});

const titleAttr = computed(() =>
  registryIdentity.value ? `${registryIdentity.value.label} - ${value.value}` : value.value,
);

// Names, registry labels, and custom labels read as regular text; raw hashes stay mono.
const isHashDisplay = computed(() => !props.name && !registryIdentity.value && !props.label);

// Registry hits render dot + text, so they need inline-flex alignment.
const identityLayoutClass = computed(() =>
  registryIdentity.value ? " inline-flex min-w-0 items-center gap-1" : "",
);

const linkClass = computed(
  () =>
    (isHashDisplay.value ? "etherscan-link font-hash break-all" : "etherscan-link break-all font-medium") +
    identityLayoutClass.value,
);

const plainClass = computed(
  () =>
    (isHashDisplay.value ? "font-hash break-all text-high" : "text-high break-all text-sm font-medium") +
    identityLayoutClass.value,
);
</script>
