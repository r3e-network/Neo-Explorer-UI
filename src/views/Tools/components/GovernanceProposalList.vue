<template>
  <div class="etherscan-card overflow-hidden">
    <div class="border-b border-line-soft bg-surface/30 px-6 py-6 md:px-8">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-xl font-black text-high tracking-tight">{{ $t("tools.governance.proposalQueueTitle") }}</h2>
          <p class="mt-1.5 text-sm text-mid max-w-2xl leading-relaxed">
            {{ $t("tools.governance.proposalQueueDesc") }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            class="inline-flex items-center rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-low"
          >
            {{ pendingRequestCount }} {{ $t("tools.governance.active") }}
          </span>
          <span
            class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400"
          >
            {{ readyToBroadcastCount }} {{ $t("tools.governance.ready") }}
          </span>
        </div>
      </div>
    </div>

    <div class="p-6 md:p-8">
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" />
      </div>
      <div
        v-else-if="requests.length === 0"
        class="rounded-3xl border-2 border-dashed border-line-soft bg-surface-muted/30 py-16 px-6 text-center text-mid"
      >
        <svg class="mx-auto h-14 w-14 text-low mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
        <p class="text-lg font-bold text-high">{{ $t("tools.governance.noPendingProposals") }}</p>
        <p class="mt-2 text-sm text-mid max-w-md mx-auto">
          {{ $t("tools.governance.noPendingProposalsDesc") }}
        </p>
        <span v-if="!connectedAccount" class="mt-2 block text-sm font-medium text-mid">{{
          $t("tools.governance.connectWalletToCreate")
        }}</span>
        <span v-else-if="!canCreateProposal" class="text-mid mt-2 text-sm font-medium">{{
          $t("tools.governance.onlyCouncilCanCreate")
        }}</span>
        <button
          v-else
          @click="emit('create-proposal')"
          class="text-primary-500 hover:underline mt-2 text-sm font-medium"
        >
          {{ $t("tools.governance.createFirstOne") }}
        </button>
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="req in requests"
          :key="req.id"
          class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface to-surface-muted/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-900/5"
        >
          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span
                  class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-low dark:bg-slate-950/50"
                >
                  {{ $t("tools.governance.proposalId", { id: req.id }) }}
                </span>
                <span
                  v-if="req.params?.hash"
                  class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-2.5 py-1 font-mono text-[10px] tracking-wider text-low dark:bg-slate-950/50"
                  :title="req.params.hash"
                >
                  {{ req.params.hash.substring(0, 8) }}&hellip;
                </span>
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                  :class="
                    req.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  "
                >
                  {{ req.status }}
                </span>
                <span
                  v-if="isOffchainReviewPacket(req)"
                  class="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700 dark:border-sky-900/30 dark:bg-sky-950/20 dark:text-sky-400"
                >
                  {{ $t("tools.governance.offchainReviewBadge") }}
                </span>
                <span
                  class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-low dark:bg-slate-950/50"
                >
                  {{
                    t("tools.governance.callCount", getRequestInvocationCount(req), {
                      count: getRequestInvocationCount(req),
                    })
                  }}
                </span>
              </div>

              <h3 class="text-lg font-black tracking-tight text-high">
                {{ req.title || req.description || req.method || $t("tools.governance.councilProposal") }}
              </h3>
              <p v-if="req.title && req.description && req.title !== req.description" class="mt-1 text-sm text-mid leading-relaxed">
                {{ req.description }}
              </p>
              <p class="mt-1.5 text-sm text-mid leading-relaxed">
                {{ getRequestMethodSummary(req) }}
              </p>

              <div class="mt-4 grid gap-3 md:grid-cols-3">
                <div class="rounded-2xl border border-line-soft bg-surface p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.15em] text-low">
                    {{ $t("tools.governance.targetSurface") }}
                  </div>
                  <div class="mt-1 font-mono text-xs break-all text-high">{{ getRequestTargetSummary(req) }}</div>
                </div>
                <div class="rounded-2xl border border-line-soft bg-surface p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.15em] text-low">
                    {{ $t("tools.governance.created") }}
                  </div>
                  <div class="mt-1 text-sm font-bold text-high">{{ formatRequestCreatedAt(req.created_at) }}</div>
                </div>
                <div class="rounded-2xl border border-line-soft bg-surface p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.15em] text-low">
                    {{ $t("tools.governance.transactionHash") }}
                  </div>
                  <div class="mt-1 font-mono text-xs break-all text-high">
                    {{ req.params?.hash || req.metadata?.tx_hash || $t("tools.governance.unavailable") }}
                  </div>
                </div>
              </div>

              <div class="mt-4">
                <div class="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span class="font-semibold text-high">{{ $t("tools.governance.signatureProgress") }}</span>
                  <span class="text-mid">{{
                    $t("tools.governance.approvalsCaptured", {
                      count: getRequestSignatureCount(req),
                      required: req.signers_required,
                    })
                  }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full border border-line-soft bg-surface-muted shadow-inner">
                  <div
                    class="h-full rounded-full transition-all duration-500 ease-out"
                    :class="
                      getRequestProgressPercent(req) >= 100
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500'
                    "
                    :style="requestProgressBarStyle(req)"
                  ></div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-3 text-xs">
                <RouterLink
                  :to="{ name: 'governanceProposalDetail', params: { id: req.id } }"
                  class="font-semibold text-primary-500 hover:underline"
                  >{{ $t("tools.governance.openProposalPage") }}</RouterLink
                >
                <button @click="emit('view-details', req)" class="font-semibold text-primary-500 hover:underline">
                  {{ $t("tools.governance.viewJsonDetails") }}
                </button>
              </div>
            </div>

            <div class="rounded-3xl border border-line-soft bg-white/80 p-5 shadow-sm dark:bg-slate-950/60">
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">
                {{ $t("tools.governance.actionPanel") }}
              </div>
              <div class="mt-3 text-3xl font-black tracking-tight text-high">
                {{ getRequestSignatureCount(req) }}
              </div>
              <div class="text-sm text-mid">
                {{ $t("tools.governance.ofRequiredSignatures", { required: getRequestRequiredCount(req) }) }}
              </div>

              <div class="mt-4 space-y-2">
                <div v-if="req.status === 'PENDING'">
                  <div
                    v-if="!isOffchainReviewPacket(req) && getRequestSignatureCount(req) >= getRequestRequiredCount(req)"
                    class="space-y-2"
                  >
                    <button
                      @click="emit('broadcast', req)"
                      class="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      {{ $t("tools.governance.broadcastTx") }}
                    </button>
                  </div>
                  <div v-else class="space-y-2">
                    <div v-if="isOffchainReviewPacket(req)" class="text-sm text-mid">
                      {{ $t("tools.governance.progressDescOffchain") }}
                    </div>
                    <button
                      @click="emit('add-witness', req)"
                      class="w-full px-4 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors"
                    >
                      {{ $t("tools.governance.addSignatureWitnessButton") }}
                    </button>
                    <p class="text-xs text-mid">
                      {{ $t("tools.governance.signGovPayloadHint") }}
                    </p>
                    <button
                      :data-testid="`governance-list-fork-${req.id}`"
                      @click="emit('fork-proposal', req)"
                      class="w-full px-4 py-2.5 bg-white text-high border border-line-soft text-sm font-bold rounded-xl hover:bg-surface transition-colors"
                    >
                      {{ $t("tools.governance.forkProposal") }}
                    </button>
                    <span
                      v-if="hasSigned(req)"
                      class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {{ $t("tools.governance.signed") }}
                    </span>
                  </div>
                </div>
                <div v-if="req.status === 'EXECUTED' && req.tx_hash">
                  <a :href="'/tx/' + req.tx_hash" class="text-xs font-semibold text-primary-500 hover:underline">{{
                    $t("tools.governance.viewTx")
                  }}</a>
                </div>
              </div>
            </div>
          </div>

          <div v-if="req.signatures?.length > 0" class="mt-4 pt-3 border-t border-line-soft">
            <div class="text-xs font-semibold text-mid mb-2">{{ $t("tools.governance.approvedBy") }}</div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="sig in req.signatures"
                :key="sig.id"
                class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded bg-surface-muted border border-line-soft text-xs text-low"
                :title="sig.signer_address"
              >
                <img
                  v-if="getCouncilIdentity(sig.signer_address).logo"
                  :src="getCouncilIdentity(sig.signer_address).logo"
                  :data-logo-fallback-index="0"
                  alt=""
                  class="h-5 w-5 rounded-full object-cover ring-1 ring-line-soft bg-white shrink-0"
                  @error="handleCouncilLogoError($event, getCouncilIdentity(sig.signer_address).logoSources)"
                />
                <span class="font-medium text-high">
                  {{
                    sig.signer_address === connectedAccount
                      ? `You · ${getCouncilIdentity(sig.signer_address).name}`
                      : getCouncilIdentity(sig.signer_address).name
                  }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Skeleton from "@/components/common/Skeleton.vue";
import { resolveCouncilIdentity } from "@/utils/councilIdentity";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";

const { t } = useI18n();

const props = defineProps({
  requests: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  connectedAccount: { type: String, default: null },
  threshold: { type: Number, default: 0 },
  councilIdentityMap: { type: Object, default: () => ({}) },
  canCreateProposal: { type: Boolean, default: false },
  isCouncilNode: { type: Boolean, default: false },
  committeePubkeys: { type: Array, default: () => [] },
});

const emit = defineEmits(["sign", "add-witness", "view-details", "broadcast", "create-proposal", "fork-proposal"]);

const pendingRequestCount = computed(() => props.requests.filter((r) => r.status === "PENDING").length);

const readyToBroadcastCount = computed(
  () =>
    props.requests.filter(
      (r) =>
        r.status === "PENDING" &&
        !isOffchainReviewPacket(r) &&
        getRequestSignatureCount(r) >= getRequestRequiredCount(r),
    ).length,
);

function hasSigned(req) {
  if (!props.connectedAccount || !req.signatures) return false;
  return req.signatures.some((s) => s.signer_address === props.connectedAccount);
}

function getRequestSignatureCount(req) {
  const explicitCount = Array.isArray(req?.signatures) ? req.signatures.length : 0;
  if (explicitCount > 0) return explicitCount;
  const metadataCount = Number(req?.metadata?.signatures_collected || 0);
  return Number.isFinite(metadataCount) && metadataCount > 0 ? metadataCount : 0;
}

function getRequestRequiredCount(req) {
  const explicitCount = Number(req?.signers_required || 0);
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount;
  const metadataCount = Number(req?.metadata?.signatures_needed || 0);
  return Number.isFinite(metadataCount) && metadataCount > 0 ? metadataCount : 0;
}

function isOffchainReviewPacket(req) {
  return Boolean(req?.metadata?.offchain_packet_only);
}

function getRequestInvocationCount(req) {
  if (Array.isArray(req?.params?.invocations) && req.params.invocations.length > 0) {
    return req.params.invocations.length;
  }

  const methods = String(req?.method || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return methods.length || 1;
}

function getRequestMethodSummary(req) {
  if (Array.isArray(req?.params?.invocations) && req.params.invocations.length > 1) {
    return req.params.invocations
      .map((invocation) => `${invocation.selectedContract}.${invocation.selectedMethod}`)
      .join(" • ");
  }

  return String(req?.method || t("tools.governance.noMethodMetadata"));
}

function getRequestTargetSummary(req) {
  if (Array.isArray(req?.params?.target_contracts) && req.params.target_contracts.length > 1) {
    return t("tools.governance.contractTargets", { count: req.params.target_contracts.length });
  }

  return req?.target_contract || t("tools.governance.unavailable");
}

function getRequestProgressPercent(req) {
  const required = getRequestRequiredCount(req);
  if (!Number.isFinite(required) || required <= 0) return 0;
  return Math.min(100, (getRequestSignatureCount(req) / required) * 100);
}

function requestProgressBarStyle(req) {
  return { width: `${getRequestProgressPercent(req)}%` };
}

function formatRequestCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("tools.governance.unknownDate");
  return date.toLocaleDateString();
}

function findCommitteePubkeyForAddress(address) {
  const target = String(address || "").trim();
  if (!target || !Array.isArray(props.committeePubkeys) || props.committeePubkeys.length === 0) return "";

  const neonJs = window.Neon;
  if (!neonJs) return "";

  for (const pubkey of props.committeePubkeys) {
    try {
      if (new neonJs.wallet.Account(pubkey).address === target) {
        return pubkey;
      }
    } catch {
      // Ignore malformed committee pubkeys.
    }
  }

  return "";
}

function buildCouncilLogoSources(address, explicitLogo = "") {
  const candidates = [];
  const normalizedLogo = String(explicitLogo || "").trim();
  if (normalizedLogo) {
    candidates.push(resolveCandidateLogoUrl(normalizedLogo));
  }

  const pubkey = findCommitteePubkeyForAddress(address);
  if (pubkey) {
    candidates.push(getDefaultCandidateLogoUrl(pubkey));
  }

  candidates.push("/img/brand/neo.png");
  return [...new Set(candidates.filter(Boolean))];
}

function resolveCouncilLogo(address, explicitLogo = "") {
  return buildCouncilLogoSources(address, explicitLogo)[0] || "/img/brand/neo.png";
}

function getCouncilIdentity(address) {
  const resolved = resolveCouncilIdentity(address, props.councilIdentityMap);
  return {
    ...resolved,
    name: resolved.name === address ? t("tools.governance.councilSigner") : resolved.name,
    logo: resolveCouncilLogo(address, resolved.logo),
    logoSources: buildCouncilLogoSources(address, resolved.logo),
  };
}

function handleCouncilLogoError(event, sources = []) {
  const element = event?.target;
  if (!element) return;

  const currentIndex = Number.parseInt(element.dataset.logoFallbackIndex || "0", 10);
  const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
  const nextSource = sources[nextIndex] || "/img/brand/neo.png";

  element.dataset.logoFallbackIndex = String(nextIndex);
  element.src = nextSource;
}
</script>
