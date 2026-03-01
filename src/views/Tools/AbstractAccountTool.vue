<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Unified AA Manager Deployer' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="page-header-icon bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600 dark:from-emerald-900/40 dark:to-emerald-800/40 dark:text-emerald-400 shadow-sm border border-emerald-200/50 dark:border-emerald-800/50">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div class="pt-1">
            <h1 class="page-title text-2xl font-extrabold tracking-tight">Unified AA Manager Deployer</h1>
            <p class="page-subtitle text-base mt-1">Deploy the singleton EIP-712 global relayer contract for Neo N3 meta-transactions.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6 md:p-8 border-t-4 border-t-emerald-500 shadow-xl shadow-emerald-900/5">
        <div class="max-w-4xl mx-auto space-y-10">
          <div v-if="!connectedAccount" class="text-center py-16 border border-dashed border-line-soft rounded-3xl bg-surface-muted/30">
             <div class="h-16 w-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-5 border border-line-soft shadow-sm">
               <svg class="h-8 w-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             </div>
             <p class="text-high text-lg font-bold mb-2">Wallet Not Connected</p>
             <p class="text-sm text-mid max-w-sm mx-auto">Please connect your EVM or Neo wallet to deploy the Unified AA Manager contract.</p>
          </div>

          <template v-else>
            <div class="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
              <div class="p-2.5 bg-emerald-100 dark:bg-emerald-800/40 rounded-xl shrink-0">
                <svg class="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div class="pt-0.5">
                <h4 class="text-base font-bold text-emerald-900 dark:text-emerald-200 mb-1.5">Global Singleton Deployment</h4>
                <p class="text-sm text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                  Unlike traditional wallets, you do <strong>not</strong> need to deploy a separate contract per user. This will deploy the centralized <code>UnifiedSmartWallet</code> gateway that isolates Virtual User states utilizing secp256k1 MetaMask EIP-712 signatures.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <div class="flex items-center gap-3 border-b border-line-soft pb-3">
                <span class="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold text-sm">1</span>
                <h2 class="text-lg font-bold text-high">Zero-Configuration Setup</h2>
              </div>
              <p class="text-sm text-mid -mt-2">
                This contract requires no initial Admins or Managers. All identity checks and access controls are handled dynamically on-chain via EIP-712 signature recovery during transaction forwarding.
              </p>
            </div>

            <!-- Documentation Section -->
            <div class="space-y-6 mt-10">
              <div class="flex items-center gap-3 border-b border-line-soft pb-3">
                <span class="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold text-sm">?</span>
                <h2 class="text-lg font-bold text-high">How It Works</h2>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <div class="p-6 rounded-2xl border border-line-soft bg-surface hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1">
                  <div class="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/40 transition-all duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
                    <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <h4 class="font-bold text-high mb-2 text-base">What is the Abstract Account?</h4>
                  <p class="text-sm text-mid leading-relaxed">
                    The Smart Account allows executing transactions indirectly. Instead of paying GAS on Neo, you sign an intent off-chain. This effectively bridges Neo N3 with EVM-based wallets seamlessly.
                  </p>
                </div>

                <div class="p-6 rounded-2xl border border-line-soft bg-surface hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1">
                  <div class="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/40 transition-all duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
                    <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
                  </div>
                  <h4 class="font-bold text-high mb-2 text-base">EVM Cross-Chain Identity</h4>
                  <p class="text-sm text-mid leading-relaxed">
                    The Smart Account standard implements EIP-712 without chain-binding. This means you can use MetaMask, Rabby, or OKX Wallet on Ethereum, BSC, or Polygon to interact directly with Neo N3 contracts.
                  </p>
                </div>

                <div class="p-6 rounded-2xl border border-line-soft bg-surface hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1">
                  <div class="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/40 transition-all duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
                    <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  </div>
                  <h4 class="font-bold text-high mb-2 text-base">Gasless Meta-Transactions</h4>
                  <p class="text-sm text-mid leading-relaxed">
                    Normally, Neo requires upfront GAS for fees. Here, a central Relayer API covers the execution fees for validly signed payloads, meaning the user pays zero upfront GAS.
                  </p>
                </div>

                <div class="p-6 rounded-2xl border border-line-soft bg-surface hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1">
                  <div class="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/40 transition-all duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
                    <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <h4 class="font-bold text-high mb-2 text-base">Multi-sig & Access Controls</h4>
                  <p class="text-sm text-mid leading-relaxed">
                    Each virtual identity in the Unified Gateway can define multiple Admins, Managers, token Whitelists, Blacklists, and customized multi-sig signature thresholds to secure assets at an institutional grade.
                  </p>
                </div>
              </div>
            </div>

            <div class="pt-10 mt-6 border-t border-line-soft flex justify-end">
               <button 
                 @click="deployContract" 
                 :disabled="isDeploying"
                 class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-base font-bold text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] border border-emerald-400/20"
               >
                 <svg v-if="isDeploying" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                 <span class="tracking-wide">{{ isDeploying ? 'Processing Deployment...' : 'Deploy Global AA Manager' }}</span>
               </button>
            </div>
            
            <transition name="fade">
              <div v-if="txHash" class="p-5 rounded-xl border border-success/30 bg-success/5 text-success/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
                <div class="flex items-start gap-3">
                  <div class="p-1 bg-success/20 rounded-full mt-0.5">
                    <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-high mb-1">Contract Deployment Transaction Submitted!</p>
                    <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
                  </div>
                </div>
                <router-link :to="`/transaction/${txHash}`" class="text-sm font-semibold whitespace-nowrap bg-success/20 hover:bg-success/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0">
                  View Transaction
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </router-link>
              </div>
            </transition>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";
import { walletService } from "@/services/walletService";
import { addressToScriptHash, base64ToHex } from "@/utils/neoHelpers";
import { ABSTRACT_ACCOUNT_NEF_BASE64, ABSTRACT_ACCOUNT_MANIFEST_STRING } from "@/constants/abstractAccountArtifacts";

const toast = useToast();
const isDeploying = ref(false);
const txHash = ref("");

function normalizeHash160(value) {
  return String(value || "").trim().toLowerCase().replace(/^0x/i, "");
}

function formatErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;

  const candidates = [
    err.description,
    err.message,
    err.error?.description,
    err.error?.message,
    err.data?.description,
    err.data?.message,
    err.response?.data?.error?.message
  ];

  for (const msg of candidates) {
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isLikelyWalletRpcError(err) {
  if (!err || typeof err !== "object") return false;

  const type = String(err.type || "").toUpperCase();
  const msg = formatErrorMessage(err).toLowerCase();
  return type === "RPC_ERROR" || /节点返回错误|node return error|invalid params|invalid argument/.test(msg);
}

function isDapiConnectionDenied(err) {
  if (!err || typeof err !== "object") return false;
  const type = String(err.type || "").toUpperCase();
  const msg = formatErrorMessage(err).toLowerCase();
  return type === "CONNECTION_DENIED" || /refused to process this request|connection denied/.test(msg);
}

function normalizeByteArrayForWallet(value) {
  const raw = String(value || "").trim();
  if (!raw) return raw;

  const withoutPrefix = raw.replace(/^0x/i, "");
  if (/^[0-9a-f]+$/i.test(withoutPrefix) && withoutPrefix.length % 2 === 0) {
    return withoutPrefix;
  }

  const hex = base64ToHex(raw);
  return hex || raw;
}

function toWalletCompatParam(param) {
  if (!param || typeof param !== "object") return param;

  if (param.type === "ByteArray" && typeof param.value === "string") {
    return { ...param, value: normalizeByteArrayForWallet(param.value) };
  }

  if (param.type === "Hash160" && typeof param.value === "string") {
    const normalized = normalizeHash160(param.value);
    if (/^[0-9a-f]{40}$/.test(normalized)) {
      return { ...param, value: `0x${normalized}` };
    }
    return param;
  }

  if (Array.isArray(param.value)) {
    return {
      ...param,
      value: param.value.map((entry) => toWalletCompatParam(entry))
    };
  }

  return param;
}

async function deployContract() {
  if (!connectedAccount.value) return;
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  try {
    const signerAddress = walletService.account?.address || connectedAccount.value;
    const signerHash = addressToScriptHash(signerAddress);
    if (!signerHash) {
      toast.error("Unable to resolve signer wallet address. Please reconnect your wallet.");
      return;
    }

    const normalizedSigner = normalizeHash160(signerHash);

    const manifestObj = JSON.parse(ABSTRACT_ACCOUNT_MANIFEST_STRING);
    // Append a unique timestamp to the name so multiple deployments of the same NEF are allowed by the network
    manifestObj.name = `UnifiedSmartWallet_${Date.now().toString().slice(-6)}`;
    const dynamicManifestStr = JSON.stringify(manifestObj);

    isDeploying.value = true;
    txHash.value = "";
    toast.info("Please review the deployment in your wallet...");

    const invokeParams = {
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd", // ContractManagement
      operation: "deploy",
      args: [
        { type: "ByteArray", value: ABSTRACT_ACCOUNT_NEF_BASE64 },
        { type: "String", value: dynamicManifestStr },
        { type: "Any", value: null } // No deployment args needed for the unified singleton
      ],
      scope: 128
    };

    if (typeof walletService.simulateInvoke === "function") {
      const simulation = await walletService.simulateInvoke(invokeParams);
      if (simulation?.state === "FAULT") {
        throw new Error(`Node preflight failed: ${simulation.exception || "VM FAULT"}`);
      }
    }

    const invokeWithBroadcastOverride = (params, broadcastOverride = true) =>
      walletService.invoke({
        ...params,
        broadcastOverride
      });

    let result;
    const isNeoLineProvider = walletService.provider === walletService.PROVIDERS?.NEOLINE;
    const buildWalletCompatParams = () => ({
      ...invokeParams,
      args: invokeParams.args.map((arg) => toWalletCompatParam(arg)),
      signers: [
        {
          account: normalizedSigner,
          scopes: 128
        }
      ]
    });

    try {
      result = await invokeWithBroadcastOverride(invokeParams, true);
    } catch (invokeError) {
      if (isNeoLineProvider && isDapiConnectionDenied(invokeError)) {
        toast.info("NeoLine compatibility mode: retrying deployment with wallet broadcast.");
        try {
          result = await invokeWithBroadcastOverride(invokeParams, false);
        } catch (walletBroadcastError) {
          if (!isLikelyWalletRpcError(walletBroadcastError) && !isDapiConnectionDenied(walletBroadcastError)) {
            throw walletBroadcastError;
          }
          const walletCompatParams = buildWalletCompatParams();
          toast.info("Wallet compatibility mode: retrying deployment with alternate encoding.");
          result = await invokeWithBroadcastOverride(walletCompatParams, false);
        }
      } else {
        if (!isLikelyWalletRpcError(invokeError)) {
          throw invokeError;
        }

        const walletCompatParams = buildWalletCompatParams();

        toast.info("Wallet compatibility mode: retrying deployment with alternate encoding.");
        result = await invokeWithBroadcastOverride(walletCompatParams, true);
      }
    }

    let deployedTxId = result?.txid || "";
    if (!deployedTxId && result?.signedTx && typeof walletService.broadcastSignedTx === "function") {
      deployedTxId = await walletService.broadcastSignedTx(result.signedTx);
    }

    if (!deployedTxId) {
      throw new Error("No transaction ID returned.");
    }

    txHash.value = deployedTxId;
    toast.success("Unified AA Manager successfully deployed!");

  } catch (err) {
    console.error(err);
    toast.error("Deployment failed: " + formatErrorMessage(err));
  } finally {
    isDeploying.value = false;
  }
}
</script>
