<template>
  <div class="etherscan-card card-tilt gradient-border-card">
    <div class="card-header">
      <h2 class="text-high text-base font-bold">{{ $t("contractDetail.overviewTitle") }}</h2>
    </div>
    <div class="divide-y soft-divider px-4">
      <InfoRow
        :label="$t('contractDetail.rowContractHash')"
        :tooltip="$t('contractDetail.rowContractHashTip')"
        :value="contract.hash || '-'"
        :copyable="!!contract.hash"
        :copy-value="contract.hash"
      />
      <InfoRow :label="$t('contractDetail.rowName')" :value="displayName" />
      <InfoRow v-if="developerName" :label="$t('contractDetail.rowDeveloper')" :value="developerName" />
      <InfoRow v-if="developerEmail" :label="$t('contractDetail.rowDeveloperEmail')">
        <a :href="`mailto:${developerEmail}`" class="etherscan-link">{{ developerEmail }}</a>
      </InfoRow>
      <InfoRow v-if="contractDescription" :label="$t('contractDetail.rowDescription')">
        <span class="whitespace-pre-wrap break-words">{{ contractDescription }}</span>
      </InfoRow>
      <InfoRow v-if="sourceCodeUrl" :label="$t('contractDetail.rowSourceCode')">
        <a :href="sourceCodeUrl" target="_blank" rel="noopener noreferrer" class="etherscan-link break-all">
          {{ sourceCodeUrl }}
        </a>
      </InfoRow>
      <InfoRow v-if="compilerName" :label="$t('contractDetail.rowCompiler')" :value="compilerName" />
      <InfoRow v-if="permissionRows.length" :label="$t('contractDetail.rowPermissions')">
        <div class="flex flex-col gap-1.5">
          <div
            v-for="(permission, index) in permissionRows"
            :key="`permission-${index}`"
            class="rounded-md bg-surface-muted px-2 py-1 text-xs break-words"
          >
            <span class="font-mono font-semibold text-high break-all">{{ permission.contract }}</span>
            <span class="text-mid break-words">: {{ permission.methods }}</span>
          </div>
        </div>
      </InfoRow>
      <InfoRow v-if="trustRows.length" :label="$t('contractDetail.rowTrusts')">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(trust, index) in trustRows"
            :key="`trust-${index}`"
            class="inline-flex max-w-full items-center rounded-md bg-surface-muted px-2 py-1 font-mono text-xs text-high break-all"
          >
            {{ trust }}
          </span>
        </div>
      </InfoRow>
      <InfoRow v-if="groupsCount" :label="$t('contractDetail.rowGroups')" :value="String(groupsCount)" />
      <InfoRow v-if="featureRows.length" :label="$t('contractDetail.rowFeatures')">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="feature in featureRows"
            :key="feature"
            class="inline-flex max-w-full items-center rounded-md bg-surface-muted px-2 py-1 font-mono text-xs text-high break-all"
          >
            {{ feature }}
          </span>
        </div>
      </InfoRow>
      <InfoRow :label="$t('contractDetail.rowCreator')" :tooltip="$t('contractDetail.rowCreatorTip')">
        <HashLink v-if="contract.sender" :hash="contract.sender" type="address" :truncated="false" :copyable="false" />
        <span v-else class="text-mid">-</span>
      </InfoRow>
      <InfoRow :label="$t('contractDetail.rowInvocations')" :value="formatNumber(contract.totalsccall || 0)" />
      <InfoRow
        :label="$t('contractDetail.rowUpdateCounter')"
        :tooltip="$t('contractDetail.rowUpdateCounterTip')"
        :value="String(contract.updatecounter ?? 0)"
      />
      <InfoRow :label="$t('contractDetail.rowVerifiedLabel')">
        <span
          v-if="isVerified"
          class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-success dark:border-emerald-800 dark:bg-emerald-900/25"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          {{ $t("contractDetail.headerVerified") }}
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-300"
        >
          {{ $t("contractDetail.rowNotVerified") }}
        </span>
      </InfoRow>
      <InfoRow v-if="supportedStandards.length" :label="$t('contractDetail.rowSupportedStandards')">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="std in supportedStandards"
            :key="'ov-' + std"
            class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            :class="nepBadgeClass(std)"
          >
            {{ std }}
          </span>
        </div>
      </InfoRow>
      <InfoRow
        :label="$t('contractDetail.rowMethodsCount')"
        :tooltip="$t('contractDetail.rowMethodsCountTip')"
        :value="String(methodsCount)"
      />
      <InfoRow
        :label="$t('contractDetail.rowEventsCount')"
        :tooltip="$t('contractDetail.rowEventsCountTip')"
        :value="String(eventsCount)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { formatNumber } from "@/utils/explorerFormat";
import { nepBadgeClass } from "@/utils/nepBadges";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import { sanitizeEmailAddress } from "@/utils/urlSafety";
import { getManifestSourceUrl } from "@/utils/contractSource";

const props = defineProps({
  contract: { type: Object, required: true },
  metadata: { type: Object, default: null },
  manifest: { type: Object, default: null },
  isVerified: { type: Boolean, default: false },
  supportedStandards: { type: Array, default: () => [] },
  methodsCount: { type: Number, default: 0 },
  eventsCount: { type: Number, default: 0 },
});

const manifestExtra = computed(() => normalizeManifestExtra(props.manifest?.extra));
const displayName = computed(() => props.metadata?.name || props.manifest?.name || props.contract.name || '-');
const developerName = computed(() => firstExtraValue(["Author", "author", "Developer", "developer"]));
const developerEmail = computed(() =>
  sanitizeEmailAddress(firstExtraValue(["Email", "email", "Mail", "mail", "DeveloperEmail", "developerEmail"])),
);
const contractDescription = computed(() => firstExtraValue(["Description", "description"]));
const sourceCodeUrl = computed(() => getManifestSourceUrl(props.manifest));
const compilerName = computed(() =>
  firstExtraValue(["Compiler", "compiler", "CompilerVersion", "compilerVersion", "Build", "build"]),
);
const permissionRows = computed(() =>
  normalizeArray(props.manifest?.permissions).map((permission) => ({
    contract: formatManifestValue(permission?.contract || "*"),
    methods: formatPermissionMethods(permission?.methods),
  })),
);
const trustRows = computed(() => normalizeArray(props.manifest?.trusts).map(formatManifestValue).filter(Boolean));
const groupsCount = computed(() => normalizeArray(props.manifest?.groups).length);
const featureRows = computed(() =>
  Object.entries(normalizeObject(props.manifest?.features))
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${String(value)}`),
);

function normalizeManifestExtra(extra) {
  if (extra && typeof extra === "object" && !Array.isArray(extra)) return extra;
  if (typeof extra === "string" && extra.trim()) {
    try {
      const parsed = JSON.parse(extra);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function firstExtraValue(keys) {
  for (const key of keys) {
    const value = manifestExtra.value?.[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function formatManifestValue(value) {
  if (value === undefined || value === null || value === "") return "*";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function formatPermissionMethods(methods) {
  if (Array.isArray(methods) && methods.length) return methods.map(formatManifestValue).join(", ");
  return formatManifestValue(methods || "*");
}
</script>
