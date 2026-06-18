<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[
          { label: $t('breadcrumb.home'), to: '/homepage' },
          { label: $t('breadcrumb.tools'), to: '/tools' },
          { label: $t('breadcrumb.contractFactory') },
        ]"
      />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              ></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t("tools.contractFactory.pageTitle") }}</h1>
            <p class="page-subtitle">{{ $t("tools.contractFactory.pageSubtitle") }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-4 space-y-4">
          <div class="etherscan-card p-5">
            <h2 class="text-base font-bold text-high mb-4">{{ $t("tools.contractFactory.selectTemplate") }}</h2>
            <div class="space-y-3">
              <label
                v-for="(tpl, key) in templates"
                :key="key"
                class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                :class="
                  selectedTemplate === key
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-line-soft bg-surface hover:border-primary-300'
                "
              >
                <input
                  type="radio"
                  v-model="selectedTemplate"
                  :value="key"
                  class="mt-1 w-4 h-4 text-primary-600 border-line-soft focus:ring-primary-500"
                  @change="resetForm"
                />
                <div>
                  <p class="text-sm font-bold text-high">{{ tpl.name }}</p>
                  <p class="text-xs text-mid mt-0.5">{{ tpl.description }}</p>
                </div>
              </label>
            </div>
          </div>

          <div class="etherscan-card p-5 bg-surface-muted">
            <h2 class="text-base font-bold text-high mb-3">{{ $t("tools.contractFactory.outputTitle") }}</h2>
            <ul class="space-y-2 text-sm text-mid">
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"></span>
                <span>{{ $t("tools.contractFactory.outputSpec") }}</span>
              </li>
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"></span>
                <span>{{ $t("tools.contractFactory.outputManifest") }}</span>
              </li>
              <li class="flex gap-2">
                <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"></span>
                <span>{{ $t("tools.contractFactory.outputHandoff") }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="lg:col-span-8">
          <div class="etherscan-card p-6 md:p-8 min-h-[400px] flex flex-col">
            <h2 class="text-lg font-bold text-high mb-4">
              {{ $t("tools.contractFactory.configureTemplate", { name: activeTemplate.name }) }}
            </h2>

            <div
              class="mb-6 p-3 rounded-lg bg-blue-50/80 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 text-sm flex gap-3"
            >
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <strong>{{ $t("tools.contractFactory.blueprintModeLabel") }}</strong>
                {{ $t("tools.contractFactory.blueprintModeDescription") }}
              </div>
            </div>

            <div class="space-y-5 flex-1">
              <div v-for="field in activeTemplate.fields" :key="field.id">
                <label class="block text-sm font-semibold text-high mb-1.5">
                  {{ field.label }} <span v-if="field.required" class="text-red-500">*</span>
                </label>

                <textarea
                  v-if="field.type === 'textarea'"
                  v-model="formData[field.id]"
                  class="form-input w-full h-24 bg-surface text-high text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-violet-500/20 hover:border-violet-400 focus:border-violet-400 transition-all outline-none"
                  :placeholder="field.placeholder"
                ></textarea>

                <input
                  v-else
                  :type="field.type"
                  v-model="formData[field.id]"
                  class="form-input w-full bg-surface text-high text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-violet-500/20 hover:border-violet-400 focus:border-violet-400 transition-all outline-none"
                  :placeholder="field.placeholder"
                  :min="field.type === 'number' ? 0 : undefined"
                  :step="field.type === 'number' ? 'any' : undefined"
                />

                <p v-if="field.hint" class="text-xs text-mid mt-1.5">{{ field.hint }}</p>
              </div>
            </div>

            <p v-if="validationErrors.length" class="mt-5 text-sm text-red-600 dark:text-red-400">
              {{ validationErrors[0] }}
            </p>

            <div class="pt-6 mt-6 border-t border-line-soft flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                @click="generateBlueprint"
                :disabled="!isFormValid"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                {{ $t("tools.contractFactory.generateBlueprint") }}
              </button>

              <button
                @click="copyBlueprint"
                :disabled="!blueprintGenerated"
                class="btn-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              >
                {{ $t("tools.contractFactory.copyBlueprint") }}
              </button>

              <button
                @click="downloadBlueprint"
                :disabled="!blueprintGenerated"
                class="btn-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              >
                {{ $t("tools.contractFactory.downloadBlueprint") }}
              </button>

              <router-link
                to="/tools/deployer"
                class="btn-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              >
                {{ $t("tools.contractFactory.openDeployer") }}
              </router-link>
            </div>

            <transition name="fade">
              <div v-if="blueprintGenerated" class="mt-6 rounded-xl border border-line-soft bg-surface-muted overflow-hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-line-soft">
                  <div>
                    <p class="text-sm font-bold text-high">{{ $t("tools.contractFactory.blueprintReadyTitle") }}</p>
                    <p class="text-xs text-mid">{{ $t("tools.contractFactory.blueprintReadyDescription") }}</p>
                  </div>
                </div>
                <pre class="max-h-96 overflow-auto p-4 text-xs leading-relaxed text-high font-mono whitespace-pre-wrap">{{ blueprintJson }}</pre>
              </div>
            </transition>

            <div v-if="!blueprintGenerated" class="mt-6 rounded-xl border border-dashed border-line-soft bg-surface-muted p-4 text-sm text-mid">
              {{ $t("tools.contractFactory.blueprintEmpty") }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";

const { t } = useI18n();
const toast = useToast();
const selectedTemplate = ref("nep17");
const blueprintGenerated = ref(false);
const formData = ref({});

const templates = computed(() => ({
  nep17: {
    name: t("tools.contractFactory.templates.nep17Name"),
    description: t("tools.contractFactory.templates.nep17Desc"),
    standard: "NEP-17",
    contractKind: "fungibleToken",
    fields: [
      {
        id: "name",
        label: t("tools.contractFactory.fields.tokenName"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.tokenNamePlaceholder"),
        required: true,
      },
      {
        id: "symbol",
        label: t("tools.contractFactory.fields.symbol"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.symbolPlaceholder"),
        required: true,
      },
      { id: "decimals", label: t("tools.contractFactory.fields.decimals"), type: "number", default: 8, required: true },
      {
        id: "initialSupply",
        label: t("tools.contractFactory.fields.initialSupply"),
        type: "number",
        default: 1000000,
        required: true,
      },
      {
        id: "author",
        label: t("tools.contractFactory.fields.author"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.authorPlaceholder"),
      },
      {
        id: "description",
        label: t("tools.contractFactory.fields.description"),
        type: "textarea",
        placeholder: t("tools.contractFactory.fields.descriptionPlaceholder"),
      },
      {
        id: "logoUrl",
        label: t("tools.contractFactory.fields.logoUrl"),
        type: "url",
        placeholder: "neofs://... or https://...",
        hint: t("tools.contractFactory.fields.logoUrlHint"),
      },
    ],
  },
  meme: {
    name: t("tools.contractFactory.templates.memeName"),
    description: t("tools.contractFactory.templates.memeDesc"),
    standard: "NEP-17",
    contractKind: "memeToken",
    fields: [
      {
        id: "name",
        label: t("tools.contractFactory.fields.memeName"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.memeNamePlaceholder"),
        required: true,
      },
      {
        id: "symbol",
        label: t("tools.contractFactory.fields.tickerSymbol"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.tickerSymbolPlaceholder"),
        required: true,
      },
      {
        id: "initialSupply",
        label: t("tools.contractFactory.fields.totalSupply"),
        type: "number",
        default: 1000000000,
        required: true,
      },
      {
        id: "twitter",
        label: t("tools.contractFactory.fields.twitter"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.twitterPlaceholder"),
      },
      {
        id: "telegram",
        label: t("tools.contractFactory.fields.telegram"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.telegramPlaceholder"),
      },
      {
        id: "logoUrl",
        label: t("tools.contractFactory.fields.memeLogo"),
        type: "url",
        placeholder: "neofs://... or https://...",
        hint: t("tools.contractFactory.fields.logoUrlHint"),
      },
    ],
  },
  nep11: {
    name: t("tools.contractFactory.templates.nep11Name"),
    description: t("tools.contractFactory.templates.nep11Desc"),
    standard: "NEP-11",
    contractKind: "nonFungibleCollection",
    fields: [
      {
        id: "name",
        label: t("tools.contractFactory.fields.collectionName"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.collectionNamePlaceholder"),
        required: true,
      },
      {
        id: "symbol",
        label: t("tools.contractFactory.fields.symbol"),
        type: "text",
        placeholder: t("tools.contractFactory.fields.nep11SymbolPlaceholder"),
        required: true,
      },
      {
        id: "baseUri",
        label: t("tools.contractFactory.fields.baseUri"),
        type: "url",
        placeholder: t("tools.contractFactory.fields.baseUriPlaceholder"),
        hint: t("tools.contractFactory.fields.baseUriHint"),
      },
      {
        id: "logoUrl",
        label: t("tools.contractFactory.fields.collectionBanner"),
        type: "url",
        placeholder: "neofs://... or https://...",
        hint: t("tools.contractFactory.fields.logoUrlHint"),
      },
    ],
  },
}));

const activeTemplate = computed(() => templates.value[selectedTemplate.value]);

const validationErrors = computed(() => {
  const errors = [];
  for (const field of activeTemplate.value.fields) {
    const value = formData.value[field.id];
    if (field.required && (value === undefined || String(value).trim() === "")) {
      errors.push(t("tools.contractFactory.validationRequired", { field: field.label }));
      continue;
    }
    if (field.type === "number" && value !== "" && value !== undefined) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors.push(t("tools.contractFactory.validationNumber", { field: field.label }));
      }
    }
  }
  return errors;
});

const isFormValid = computed(() => validationErrors.value.length === 0);

const normalizedParameters = computed(() => {
  const out = {};
  for (const field of activeTemplate.value.fields) {
    const raw = formData.value[field.id];
    if (field.type === "number") {
      out[field.id] = raw === "" || raw === undefined ? null : Number(raw);
    } else {
      out[field.id] = String(raw ?? "").trim();
    }
  }
  return out;
});

const manifestExtra = computed(() => {
  const params = normalizedParameters.value;
  const extra = {
    Name: params.name || activeTemplate.value.name,
    Description: params.description || activeTemplate.value.description,
  };
  if (params.author) extra.Author = params.author;
  if (params.logoUrl) extra.Logo = params.logoUrl;
  if (params.twitter) extra.Twitter = params.twitter;
  if (params.telegram) extra.Telegram = params.telegram;
  if (params.baseUri) extra.BaseURI = params.baseUri;
  return extra;
});

const blueprint = computed(() => ({
  schema: "neo3scan.contract-blueprint.v1",
  template: selectedTemplate.value,
  contractKind: activeTemplate.value.contractKind,
  standard: activeTemplate.value.standard,
  parameters: normalizedParameters.value,
  manifest: {
    name: normalizedParameters.value.name || activeTemplate.value.name,
    groups: [],
    supportedstandards: [activeTemplate.value.standard],
    abi: { methods: [], events: [] },
    permissions: [],
    trusts: [],
    extra: manifestExtra.value,
  },
  handoff: {
    compile: "Compile the contract source with the Neo smart contract compiler to produce a NEF and manifest.",
    deploy: "Open the Contract Deployer tool and submit the generated NEF plus manifest with a connected wallet.",
    deployerPath: "/tools/deployer",
  },
}));

const blueprintJson = computed(() => JSON.stringify(blueprint.value, null, 2));

function resetForm() {
  const newForm = {};
  for (const field of activeTemplate.value.fields) {
    newForm[field.id] = field.default !== undefined ? field.default : "";
  }
  formData.value = newForm;
  blueprintGenerated.value = false;
}

resetForm();

function generateBlueprint() {
  if (!isFormValid.value) {
    toast.error(validationErrors.value[0] || t("tools.contractFactory.validationGeneric"));
    return;
  }
  blueprintGenerated.value = true;
  toast.success(t("tools.contractFactory.toasts.blueprintGenerated"));
}

async function copyBlueprint() {
  if (!blueprintGenerated.value) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(blueprintJson.value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = blueprintJson.value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast.success(t("tools.contractFactory.toasts.copySuccess"));
  } catch {
    toast.error(t("tools.contractFactory.toasts.copyFailed"));
  }
}

function downloadBlueprint() {
  if (!blueprintGenerated.value) return;
  const safeName = String(normalizedParameters.value.symbol || normalizedParameters.value.name || selectedTemplate.value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || selectedTemplate.value;
  const blob = new Blob([blueprintJson.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}-neo-contract-blueprint.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  toast.success(t("tools.contractFactory.toasts.downloadSuccess"));
}
</script>
