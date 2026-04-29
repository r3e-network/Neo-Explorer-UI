<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.tools'), to: '/tools' }, { label: $t('breadcrumb.contractFactory') }]"
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
            <h1 class="page-title">{{ $t('tools.contractFactory.pageTitle') }}</h1>
            <p class="page-subtitle">{{ $t('tools.contractFactory.pageSubtitle') }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sidebar / Selection -->
        <div class="lg:col-span-4 space-y-4">
          <div class="etherscan-card p-5">
            <h2 class="text-base font-bold text-high mb-4">{{ $t('tools.contractFactory.selectTemplate') }}</h2>
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

          <div v-if="!connectedAccount" class="etherscan-card p-5 bg-surface-muted border-dashed text-center">
            <svg class="h-8 w-8 text-mid mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              ></path>
            </svg>
            <p class="text-sm font-semibold text-high mb-1">{{ $t('tools.contractFactory.walletNotConnected') }}</p>
            <p class="text-xs text-mid">{{ $t('tools.contractFactory.connectToDeploy') }}</p>
          </div>
        </div>

        <!-- Form Area -->
        <div class="lg:col-span-8">
          <div class="etherscan-card p-6 md:p-8 min-h-[400px] flex flex-col">
            <h2 class="text-lg font-bold text-high mb-4">{{ $t('tools.contractFactory.configureTemplate', { name: activeTemplate.name }) }}</h2>

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
                <strong>{{ $t('tools.contractFactory.demoModeLabel') }}</strong> {{ $t('tools.contractFactory.demoModeDescription') }}
              </div>
            </div>

            <div class="space-y-5 flex-1">
              <div v-for="field in activeTemplate.fields" :key="field.id">
                <label class="block text-sm font-semibold text-high mb-1.5"
                  >{{ field.label }} <span v-if="field.required" class="text-red-500">*</span></label
                >

                <div v-if="field.type === 'neofs_upload'" class="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    v-model="formData[field.id]"
                    class="form-input flex-1 bg-surface text-high text-sm font-mono rounded-xl shadow-inner focus:ring-2 focus:ring-violet-500/20 hover:border-violet-400 focus:border-violet-400 transition-all outline-none"
                    :placeholder="field.placeholder"
                  />
                  <button
                    @click="triggerLogoInput(field.id)"
                    class="shrink-0 btn-outline flex items-center justify-center gap-2 text-sm px-4 py-2"
                    :disabled="isUploadingLogo || !isFactoryMockEnabled"
                  >
                    <svg v-if="isUploadingLogo" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      ></path>
                    </svg>
                    {{ $t('tools.contractFactory.uploadToNeoFS') }}
                  </button>
                  <input
                    type="file"
                    :ref="setLogoInputRef(field.id)"
                    class="hidden"
                    accept="image/*"
                    @change="(e) => uploadLogoToNeoFS(e, field.id)"
                  />
                </div>

                <textarea
                  v-else-if="field.type === 'textarea'"
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
                />

                <p v-if="field.hint" class="text-xs text-mid mt-1.5">{{ field.hint }}</p>
              </div>
            </div>

            <div class="pt-6 mt-6 border-t border-line-soft flex items-center justify-end">
              <button
                @click="deployFactoryContract"
                :disabled="!connectedAccount || isDeploying || !isFormValid || !isFactoryMockEnabled"
                class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                <svg v-if="isDeploying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  ></path>
                </svg>
                {{ isDeploying ? $t('tools.contractFactory.deploying') : $t('tools.contractFactory.deployContract') }}
              </button>
            </div>

            <transition name="fade">
              <div
                v-if="txHash"
                class="p-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-800 dark:text-green-400 flex items-center justify-between mt-6"
              >
                <div>
                  <p class="text-sm font-bold mb-1">{{ $t('tools.contractFactory.txSubmitted') }}</p>
                  <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
                </div>
                <router-link
                  :to="`/transaction-info/${txHash}`"
                  class="text-sm font-semibold hover:underline flex items-center gap-1.5 whitespace-nowrap bg-green-200/50 dark:bg-green-800/50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-300/50 dark:hover:bg-green-700/50"
                >
                  {{ $t('tools.contractFactory.viewTx') }}
                </router-link>
              </div>
            </transition>
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
import { connectedAccount } from "@/utils/wallet";
import { useToast } from "vue-toastification";
import { walletService } from "@/services/walletService";
import { loadNeonJs } from "@/utils/neonLoader";
// Account is resolved lazily to avoid crashes if Neon SDK loads after module evaluation
import { GAS_HASH } from "@/constants";

const { t } = useI18n();
const toast = useToast();
const selectedTemplate = ref("nep17");
const isDeploying = ref(false);
const isUploadingLogo = ref(false);
const txHash = ref("");
const formData = ref({});
const isFactoryMockEnabled = computed(
  () => Boolean(import.meta.env.DEV) || import.meta.env.VITE_ENABLE_CONTRACT_FACTORY_MOCK === "true",
);

const templates = computed(() => ({
  nep17: {
    name: t("tools.contractFactory.templates.nep17Name"),
    description: t("tools.contractFactory.templates.nep17Desc"),
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
      { id: "logoUrl", label: t("tools.contractFactory.fields.logoUrl"), type: "neofs_upload", placeholder: "neofs:..." },
    ],
  },
  meme: {
    name: t("tools.contractFactory.templates.memeName"),
    description: t("tools.contractFactory.templates.memeDesc"),
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
        type: "neofs_upload",
        placeholder: "neofs:...",
      },
    ],
  },
  nep11: {
    name: t("tools.contractFactory.templates.nep11Name"),
    description: t("tools.contractFactory.templates.nep11Desc"),
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
        type: "text",
        placeholder: t("tools.contractFactory.fields.baseUriPlaceholder"),
        hint: t("tools.contractFactory.fields.baseUriHint"),
      },
      {
        id: "logoUrl",
        label: t("tools.contractFactory.fields.collectionBanner"),
        type: "neofs_upload",
        placeholder: "neofs:...",
      },
    ],
  },
}));

const activeTemplate = computed(() => templates.value[selectedTemplate.value]);

const isFormValid = computed(() => {
  for (const field of activeTemplate.value.fields) {
    if (field.required && !formData.value[field.id]) {
      return false;
    }
  }
  return true;
});

function resetForm() {
  const newForm = {};
  for (const field of activeTemplate.value.fields) {
    newForm[field.id] = field.default !== undefined ? field.default : "";
  }
  formData.value = newForm;
  txHash.value = "";
}

// Initialize form
resetForm();

const inputRefs = ref({});
function setLogoInputRef(id) {
  return (el) => {
    if (el) inputRefs.value[id] = el;
  };
}
function triggerLogoInput(id) {
  if (!isFactoryMockEnabled.value) {
    toast.error("Contract factory demo actions are disabled in this deployment.");
    return;
  }
  const el = inputRefs.value[id];
  if (el) el.click();
}

async function uploadLogoToNeoFS(e, fieldId) {
  const file = e.target.files[0];
  if (!file) return;

  if (!isFactoryMockEnabled.value) {
    toast.error("Contract factory demo actions are disabled in this deployment.");
    e.target.value = null;
    return;
  }

  if (!walletService.isConnected) {
    toast.error(t("tools.contractFactory.toasts.connectFirst"));
    return;
  }

  // NOTE: signMessage is tricky across different wallets (O3 vs NeoLine vs WC).
  // Some wallets only support invoke securely via standard interface.
  // For this mock demo, we will bypass strict signature requirements if not NeoLine
  // or we can just mock it for now since we are just filling a string.

  isUploadingLogo.value = true;
  toast.info(t("tools.contractFactory.toasts.preparingUpload"));

  try {
    // Mock successful upload by generating a NeoFS OID after a small delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockOid = Array.from(
      { length: 44 },
      () => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)],
    ).join("");
    formData.value[fieldId] = `neofs:${mockOid}`;
    toast.success(t("tools.contractFactory.toasts.uploadSuccess"));
  } catch (err) {
    if (import.meta.env.DEV) console.error(err);
    toast.error(t("tools.contractFactory.toasts.uploadFailed"));
  } finally {
    isUploadingLogo.value = false;
    e.target.value = null; // reset input
  }
}

async function deployFactoryContract() {
  if (!connectedAccount.value || !isFormValid.value) return;

  if (!isFactoryMockEnabled.value) {
    toast.error("Contract factory demo actions are disabled in this deployment.");
    return;
  }

  if (!walletService.isConnected) {
    toast.error(t("tools.contractFactory.toasts.connectFirst"));
    return;
  }

  isDeploying.value = true;
  txHash.value = "";

  try {
    toast.info(t("tools.contractFactory.toasts.compilingParams"));
    // Simulate compilation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.info(t("tools.contractFactory.toasts.reviewInWallet"));

    // In a real factory, we would invoke the Factory Contract with our parameters.
    // For this demonstration, we simulate the factory deployment signature payload.
    // Let's do a self-transfer with a remark containing the template instructions to simulate deployment on-chain.

    const sdk = (await loadNeonJs()) || window.Neon;
    const Account = sdk?.wallet?.Account;
    if (!Account) {
      toast.error(t("tools.contractFactory.toasts.neonNotLoaded"));
      return;
    }
    const userScriptHash = new Account(connectedAccount.value).scriptHash;

    const result = await walletService.invoke({
      scriptHash: GAS_HASH, // GAS
      operation: "transfer",
      args: [
        { type: "Hash160", value: userScriptHash },
        { type: "Hash160", value: userScriptHash },
        { type: "Integer", value: "0" },
        { type: "String", value: "FactoryDeploy:" + selectedTemplate.value },
      ],
      scope: 1,
    });

    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success(t("tools.contractFactory.toasts.deploySuccess", { name: activeTemplate.value.name }));
    } else {
      throw new Error(t("tools.contractFactory.toasts.noTxId"));
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    const reason = e.description || e.message || t("tools.contractFactory.toasts.userRejected");
    toast.error(t("tools.contractFactory.toasts.deployFailed", { reason }));
  } finally {
    isDeploying.value = false;
  }
}
</script>
