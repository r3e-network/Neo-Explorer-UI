<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
  >
    <div
      class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]"
    >
      <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-high tracking-tight">{{ $t("tools.governance.createCouncilProposal") }}</h2>
        </div>
        <button
          @click="$emit('close')"
          aria-label="Close"
          class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <div
          v-if="isGovernanceLabModeAvailable"
          class="space-y-3 rounded-2xl border border-line-soft bg-surface-muted/50 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-high tracking-tight">{{ $t("tools.governance.proposalMode") }}</h3>
              <p class="mt-1 text-xs text-mid">
                {{ $t("tools.governance.proposalModeDesc") }}
              </p>
            </div>
            <div class="inline-flex rounded-xl border border-line-soft bg-surface p-1">
              <button
                data-testid="governance-mode-official"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="createForm.mode === 'official' ? 'bg-amber-500 text-white' : 'text-mid hover:text-high'"
                @click="setCreateMode('official')"
              >
                {{ $t("tools.governance.officialCouncil") }}
              </button>
              <button
                data-testid="governance-mode-lab"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="createForm.mode === 'lab' ? 'bg-amber-500 text-white' : 'text-mid hover:text-high'"
                @click="setCreateMode('lab')"
              >
                {{ $t("tools.governance.labMode") }}
              </button>
            </div>
          </div>

          <div v-if="createForm.mode === 'lab'" class="grid grid-cols-1 gap-4 md:grid-cols-[1fr,180px]">
            <div class="space-y-2">
              <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">{{
                $t("tools.governance.signerPublicKeys")
              }}</label>
              <textarea
                data-testid="lab-signer-pubkeys"
                v-model="createForm.labSignerPubkeys"
                rows="5"
                class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none font-mono"
                placeholder="One compressed public key per line, or comma-separated"
              ></textarea>
              <p class="text-xs text-mid">
                {{ $t("tools.governance.signerPubkeysDesc") }}
              </p>
            </div>
            <div class="space-y-2">
              <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">{{
                $t("tools.governance.signatureThreshold")
              }}</label>
              <input
                data-testid="lab-threshold"
                v-model="createForm.labThreshold"
                type="number"
                min="1"
                class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
              />
              <div class="rounded-xl border border-dashed border-line-soft bg-surface/50 px-3 py-2 text-xs text-mid">
                {{ $t("tools.governance.signersDetected") }}
                <span class="font-semibold text-high">{{ parsedLabSignerCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-bold text-high tracking-tight">{{
            $t("tools.governance.proposalDescription")
          }}</label>
          <input
            v-model="createForm.description"
            type="text"
            class="form-input w-full bg-surface text-sm py-2.5 px-4 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
            placeholder="e.g. Decrease GAS Network Fee"
          />
        </div>

        <div class="space-y-6">
          <div
            v-for="(inv, idx) in createForm.invocations"
            :key="idx"
            class="p-5 rounded-2xl bg-surface-muted/50 border border-line-soft space-y-5 relative group transition-colors hover:border-amber-400"
          >
            <div class="flex justify-between items-center pb-2 border-b border-line-soft">
              <h3 class="text-sm font-bold text-high tracking-tight flex items-center gap-2">
                <span
                  class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs"
                  >{{ idx + 1 }}</span
                >
                {{ $t("tools.governance.invocation") }}
              </h3>
              <button
                v-if="createForm.invocations.length > 1"
                @click="removeInvocation(idx)"
                class="text-red-500 hover:text-red-600 text-xs font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                {{ $t("tools.governance.remove") }}
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-2">
                <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">{{
                  $t("tools.governance.targetContract")
                }}</label>
                <select
                  v-model="inv.selectedContract"
                  @change="handleContractChange(idx)"
                  class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all cursor-pointer outline-none"
                >
                  <option v-for="(addr, name) in NATIVE_CONTRACTS" :key="name" :value="name">{{ name }}</option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">{{
                  $t("tools.governance.methodToInvoke")
                }}</label>
                <select
                  v-model="inv.selectedMethod"
                  @change="inv.params = {}"
                  class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all cursor-pointer outline-none"
                >
                  <option v-for="m in getAvailableMethods(inv.selectedContract)" :key="m.name" :value="m.name">
                    {{ m.name }}
                  </option>
                </select>
              </div>
            </div>

            <div
              v-if="
                getMethodDefinition(inv.selectedContract, inv.selectedMethod)?.description ||
                formatMethodCallFlags(getMethodDefinition(inv.selectedContract, inv.selectedMethod))
              "
              class="rounded-2xl border border-line-soft bg-surface/70 p-4 space-y-2"
            >
              <p
                v-if="getMethodDefinition(inv.selectedContract, inv.selectedMethod)?.description"
                class="text-sm text-high leading-relaxed"
              >
                {{ getMethodDefinition(inv.selectedContract, inv.selectedMethod).description }}
              </p>
              <p
                v-if="formatMethodCallFlags(getMethodDefinition(inv.selectedContract, inv.selectedMethod))"
                class="text-[11px] font-medium uppercase tracking-[0.18em] text-low"
              >
                {{ $t("tools.governance.callFlags") }}
                {{ formatMethodCallFlags(getMethodDefinition(inv.selectedContract, inv.selectedMethod)) }}
              </p>
            </div>

            <div v-if="getMethodParams(inv.selectedContract, inv.selectedMethod).length > 0" class="space-y-3 pt-2">
              <div
                v-for="(param, pIdx) in getMethodParams(inv.selectedContract, inv.selectedMethod)"
                :key="pIdx"
                class="space-y-1.5"
              >
                <label class="block text-xs font-bold text-high tracking-tight"
                  >{{ param.label || param.name }}
                  <span class="font-normal text-mid ml-1">({{ param.type }})</span></label
                >
                <p v-if="param.description" class="text-xs text-mid leading-relaxed">{{ param.description }}</p>
                <p v-if="param.example || param.hint" class="text-[11px] text-low leading-relaxed">
                  <span v-if="param.example"
                    >Example: <span class="font-mono text-high">{{ param.example }}</span></span
                  >
                  <span v-if="param.example && param.hint"> · </span>
                  <span v-if="param.hint">{{ param.hint }}</span>
                </p>
                <input
                  v-model="inv.params[param.name]"
                  type="text"
                  class="form-input w-full bg-surface text-sm py-2 px-3 rounded-lg border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all outline-none"
                  :placeholder="param.placeholder || `Enter ${param.type} value`"
                />
              </div>
            </div>

            <div
              v-else
              class="p-4 text-center border border-dashed border-line-soft rounded-xl bg-surface/50 text-mid text-xs"
            >
              {{ $t("tools.governance.noParamsRequired") }}
            </div>
          </div>

          <button
            @click="addInvocation"
            class="w-full py-3.5 border-2 border-dashed border-line-soft rounded-2xl text-amber-600 dark:text-amber-500 font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-400 transition-all flex items-center justify-center gap-2 group"
          >
            <svg
              class="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            {{ $t("tools.governance.addAnotherInvocation") }}
          </button>
        </div>
      </div>
      <div class="px-6 py-4 border-t border-line-soft bg-surface/50 flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-6 py-2.5 text-sm font-bold text-mid hover:text-high hover:bg-surface-muted rounded-xl transition-all"
        >
          {{ $t("tools.governance.cancel") }}
        </button>
        <button
          @click="handleCreateProposal"
          :disabled="isCreating || !createForm.description"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
        >
          <svg v-if="isCreating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {{ isCreating ? $t("tools.governance.creating") : $t("tools.governance.createProposal") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { supabaseService } from "@/services/supabaseService";
import { walletService } from "@/services/walletService";
import { getRpcClientUrl, getCurrentEnv } from "@/utils/env";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { isPublicKeyHex } from "@/utils/neoHelpers";
import { useToast } from "vue-toastification";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  isGovernanceLabModeAvailable: { type: Boolean, default: false },
  connectedAccount: { type: String, default: null },
  committeePubkeys: { type: Array, default: () => [] },
  threshold: { type: Number, default: 0 },
  committeeMultiSig: { type: Object, default: null },
  isCouncilNode: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "created"]);

const toast = useToast();

const NATIVE_CONTRACTS = {
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
};

const NATIVE_METHODS = {
  PolicyContract: [
    {
      name: "setFeePerByte",
      params: [{ name: "value", type: "Integer" }],
    },
    {
      name: "setExecFeeFactor",
      params: [{ name: "value", type: "Integer" }],
    },
    {
      name: "setStoragePrice",
      params: [{ name: "value", type: "Integer" }],
    },
    {
      name: "setMillisecondsPerBlock",
      description: "Block generation time in milliseconds.",
      callFlags: ["States", "AllowNotify"],
      params: [
        {
          name: "value",
          type: "Integer",
          label: "Milliseconds Per Block",
          description: "Block generation time in milliseconds.",
          example: "3000",
          hint: "Use 3000 for a 3 second block interval.",
          placeholder: "e.g. 3000",
        },
      ],
    },
    {
      name: "blockAccount",
      params: [{ name: "account", type: "Hash160" }],
    },
    {
      name: "unblockAccount",
      params: [{ name: "account", type: "Hash160" }],
    },
  ],
  RoleManagement: [
    {
      name: "designateAsRole",
      params: [
        { name: "role", type: "Integer" },
        { name: "nodes", type: "Array" },
      ],
    },
  ],
  OracleContract: [{ name: "setPrice", params: [{ name: "price", type: "Integer" }] }],
  NEO: [
    {
      name: "setGasPerBlock",
      description: "GAS generated per block, expressed in GAS fractions.",
      callFlags: ["States"],
      params: [
        {
          name: "gasPerBlock",
          type: "Integer",
          label: "GAS Per Block",
          description: "GAS generated per block, expressed in GAS fractions.",
          example: "100000000",
          hint: "1 GAS = 100000000.",
          placeholder: "e.g. 100000000",
        },
      ],
    },
    { name: "setRegisterPrice", params: [{ name: "registerPrice", type: "Integer" }] },
  ],
};

function createInvocation() {
  const defaultContract = "PolicyContract";
  const methods = getAvailableMethods(defaultContract);
  return {
    selectedContract: defaultContract,
    selectedMethod: methods.length > 0 ? methods[0].name : "",
    params: {},
  };
}

const createForm = ref({
  description: "",
  mode: "official",
  labSignerPubkeys: "",
  labThreshold: "2",
  invocations: [createInvocation()],
});

const isCreating = ref(false);

function getAvailableMethods(contract) {
  return NATIVE_METHODS[contract] || [];
}

function getMethodDefinition(contract, methodName) {
  const methods = getAvailableMethods(contract);
  return methods.find((method) => method.name === methodName) || null;
}

function getMethodParams(contract, methodName) {
  const method = getMethodDefinition(contract, methodName);
  return method ? method.params : [];
}

function resolveMethodCallFlags(method, neonJs) {
  if (!method?.callFlags?.length || !neonJs?.sc?.CallFlags) return undefined;
  return method.callFlags.reduce((value, flagName) => {
    const flagValue = neonJs.sc.CallFlags?.[flagName];
    return Number.isFinite(flagValue) ? value | flagValue : value;
  }, 0);
}

function formatMethodCallFlags(method) {
  if (!method?.callFlags?.length) return "";
  return method.callFlags.join(" | ");
}

function handleContractChange(index) {
  const inv = createForm.value.invocations[index];
  const methods = getAvailableMethods(inv.selectedContract);
  if (methods.length > 0) {
    inv.selectedMethod = methods[0].name;
    inv.params = {};
  }
}

function addInvocation() {
  createForm.value.invocations.push(createInvocation());
}

function removeInvocation(index) {
  if (createForm.value.invocations.length > 1) {
    createForm.value.invocations.splice(index, 1);
  }
}

function normalizeSignerPubkeys(rawValue) {
  return [
    ...new Set(
      String(rawValue || "")
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

const parsedLabSignerCount = computed(() => normalizeSignerPubkeys(createForm.value.labSignerPubkeys).length);

function setCreateMode(mode) {
  createForm.value.mode = mode;
}

function resolveSignerConfig(neonJs) {
  if (createForm.value.mode === "lab") {
    if (!props.isGovernanceLabModeAvailable) {
      throw new Error("Lab mode is only available on testnet.");
    }

    const signerPubkeys = normalizeSignerPubkeys(createForm.value.labSignerPubkeys);
    if (signerPubkeys.length === 0) {
      throw new Error("Add at least one signer public key for lab mode.");
    }

    for (const pubkey of signerPubkeys) {
      if (!isPublicKeyHex(pubkey)) {
        throw new Error(`Invalid signer public key: ${pubkey}`);
      }
    }

    const thresholdValue = Number.parseInt(String(createForm.value.labThreshold || ""), 10);
    if (!Number.isFinite(thresholdValue) || thresholdValue < 1 || thresholdValue > signerPubkeys.length) {
      throw new Error("Lab threshold must be between 1 and the number of signer public keys.");
    }

    const signerAddresses = signerPubkeys.map((pubkey) => new neonJs.wallet.Account(pubkey).address);
    if (!signerAddresses.includes(props.connectedAccount)) {
      throw new Error("Connected wallet must be included in the lab signer public keys.");
    }

    return {
      mode: "lab",
      signerPubkeys,
      signerAddresses,
      thresholdValue,
      multiSigAccount: neonJs.wallet.Account.createMultiSig(thresholdValue, signerPubkeys),
    };
  }

  const signerAddresses = props.committeePubkeys.map((pubkey) => new neonJs.wallet.Account(pubkey).address);

  return {
    mode: "official",
    signerPubkeys: props.committeePubkeys,
    signerAddresses,
    thresholdValue: props.threshold,
    multiSigAccount: props.committeeMultiSig,
  };
}

function normalizeArg(val, type, neonJs) {
  if (type === "Integer") return neonJs.sc.ContractParam.integer(val);
  if (type === "Hash160") {
    if (val.startsWith("N") && val.length === 34) {
      return neonJs.sc.ContractParam.hash160(neonJs.wallet.getScriptHashFromAddress(val));
    }
    return neonJs.sc.ContractParam.hash160(val);
  }
  if (type === "Array") {
    try {
      const arr = JSON.parse(val);
      return neonJs.sc.ContractParam.array(arr.map((i) => neonJs.sc.ContractParam.any(i)));
    } catch {
      throw new Error("Invalid Array format. Provide a JSON array.");
    }
  }
  return neonJs.sc.ContractParam.string(val);
}

async function handleCreateProposal() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first.");
    return;
  }
  if (createForm.value.mode !== "lab" && !props.isCouncilNode) {
    toast.error("Only council nodes can create proposals.");
    return;
  }
  if (!createForm.value.description) {
    toast.error("Please enter a description.");
    return;
  }
  if (createForm.value.invocations.length === 0) {
    toast.error("At least one invocation is required.");
    return;
  }

  isCreating.value = true;
  try {
    const neonJs = window.Neon || (await import("@r3e/neo-js-sdk"));
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const currentHeight = await rpcClient.getBlockCount();
    const signerConfig = resolveSignerConfig(neonJs);

    const intents = createForm.value.invocations.map((inv) => {
      const targetContract = NATIVE_CONTRACTS[inv.selectedContract];
      const method = inv.selectedMethod;

      const mDef = getMethodDefinition(inv.selectedContract, method);

      const args = mDef.params.map((p) => {
        const val = inv.params[p.name];
        if (val === undefined || val === "") throw new Error(`Missing param: ${p.name} in method ${method}`);
        return normalizeArg(val, p.type, neonJs);
      });

      const callFlags = resolveMethodCallFlags(mDef, neonJs);

      return {
        scriptHash: targetContract,
        operation: method,
        args,
        ...(callFlags !== undefined ? { callFlags } : {}),
      };
    });

    const script = neonJs.sc.createScript(...intents);

    const t = new neonJs.tx.Transaction({
      signers: [{ account: signerConfig.multiSigAccount.scriptHash, scopes: neonJs.tx.WitnessScope.Global }],
      validUntilBlock: currentHeight + 100000,
      systemFee: "100000000",
      networkFee: "500000000",
      script: neonJs.u.HexString.fromHex(script),
    });

    const unsignedTxHex = t.serialize(false);
    const txHash = t.hash();

    const targetContracts = createForm.value.invocations.map((inv) => NATIVE_CONTRACTS[inv.selectedContract]);
    const methods = createForm.value.invocations.map((inv) => inv.selectedMethod).join(",");
    const targetSummary = targetContracts.length > 1 ? "MULTI_CALL" : targetContracts[0] || "";

    const payload = {
      type: "governance",
      creator_address: props.connectedAccount,
      target_contract: targetSummary,
      method: methods.length > 255 ? methods.substring(0, 250) + "..." : methods,
      description: createForm.value.description,
      signers_required: signerConfig.thresholdValue,
      eligible_signers: signerConfig.signerAddresses,
      status: "PENDING",
      network: toNetworkMode(getCurrentEnv()) || "mainnet",
      params: {
        unsigned_tx: unsignedTxHex,
        hash: txHash,
        scriptHash: signerConfig.multiSigAccount.scriptHash,
        committee_pubkeys: signerConfig.signerPubkeys,
        governance_mode: signerConfig.mode,
        lab_mode: signerConfig.mode === "lab",
        lab_signer_addresses: signerConfig.mode === "lab" ? signerConfig.signerAddresses : undefined,
        target_contracts: targetContracts,
        invocations: createForm.value.invocations.map((inv) => ({
          ...inv,
          targetHash: NATIVE_CONTRACTS[inv.selectedContract],
        })),
      },
    };

    const res = await supabaseService.createMultisigRequest(payload);
    if (!res.success) throw new Error(res.error);

    toast.success("Proposal created successfully!");
    createForm.value = {
      description: "",
      mode: "official",
      labSignerPubkeys: "",
      labThreshold: "2",
      invocations: [createInvocation()],
    };
    emit("close");
    emit("created");
  } catch (e) {
    console.error(e);
    toast.error("Failed to create proposal: " + e.message);
  } finally {
    isCreating.value = false;
  }
}
</script>
