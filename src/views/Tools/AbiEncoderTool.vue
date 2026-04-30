<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[
          { label: $t('breadcrumb.home'), to: '/homepage' },
          { label: $t('breadcrumb.tools'), to: '/tools' },
          { label: $t('breadcrumb.abiEncoder') },
        ]"
      />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              ></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t('tools.abiEncoder.pageTitle') }}</h1>
            <p class="page-subtitle">
              {{ $t('tools.abiEncoder.pageSubtitle') }}
            </p>
          </div>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <!-- Tabs -->
        <div class="flex border-b border-line-soft bg-surface-muted/30">
          <button
            @click="activeMode = 'encode'"
            class="flex-1 sm:flex-none px-8 py-4 font-bold text-sm transition-all duration-300 border-b-2 tracking-tight"
            :class="
              activeMode === 'encode'
                ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-mid hover:text-high hover:bg-surface'
            "
          >
            {{ $t('tools.abiEncoder.tabEncode') }}
          </button>
          <button
            @click="activeMode = 'decode'"
            class="flex-1 sm:flex-none px-8 py-4 font-bold text-sm transition-all duration-300 border-b-2 tracking-tight"
            :class="
              activeMode === 'decode'
                ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-mid hover:text-high hover:bg-surface'
            "
          >
            {{ $t('tools.abiEncoder.tabDecode') }}
          </button>
        </div>

        <div class="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
          <!-- Encode Mode -->
          <template v-if="activeMode === 'encode'">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="block text-sm font-bold text-high tracking-tight">{{ $t('tools.abiEncoder.contractHashLabel') }}</label>
                <input
                  type="text"
                  v-model="encodeForm.contractHash"
                  class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20 hover:border-fuchsia-400 focus:border-fuchsia-400 transition-all outline-none"
                  :placeholder="$t('tools.abiEncoder.contractHashPlaceholder')"
                />
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-bold text-high tracking-tight">{{ $t('tools.abiEncoder.methodLabel') }}</label>
                <input
                  type="text"
                  v-model="encodeForm.method"
                  class="form-input w-full bg-surface text-high text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20 hover:border-fuchsia-400 focus:border-fuchsia-400 transition-all outline-none"
                  :placeholder="$t('tools.abiEncoder.methodPlaceholder')"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-bold text-high tracking-tight">{{ $t('tools.abiEncoder.paramsLabel') }}</label>
                <button
                  @click="addParam"
                  class="text-xs font-bold text-fuchsia-600 hover:text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg dark:bg-fuchsia-900/30 dark:hover:bg-fuchsia-900/50 dark:text-fuchsia-400 transition-all duration-300 shadow-sm"
                >
                  {{ $t('tools.abiEncoder.addParam') }}
                </button>
              </div>

              <div
                v-if="encodeForm.params.length === 0"
                class="p-6 text-center border-2 border-dashed border-line-soft rounded-2xl bg-surface-muted/50 text-mid text-sm"
              >
                {{ $t('tools.abiEncoder.noParamsHint') }} <span class="font-bold text-fuchsia-500">{{ $t('tools.abiEncoder.addParamHinted') }}</span> {{ $t('tools.abiEncoder.noParamsHintTrailing') }}
              </div>

              <transition-group name="list" tag="div" class="space-y-3">
                <div
                  v-for="(param, i) in encodeForm.params"
                  :key="i"
                  class="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-surface-muted p-2 pr-3 rounded-2xl border border-line-soft relative group hover:border-primary-400 transition-colors shadow-sm"
                >
                  <div class="w-full sm:w-1/3 flex items-center">
                    <div class="px-3 text-mid font-mono text-xs opacity-50 shrink-0">{{ i + 1 }}</div>
                    <select
                      v-model="param.type"
                      class="form-input w-full bg-surface text-sm font-semibold text-high border-transparent cursor-pointer rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20 hover:border-fuchsia-400 focus:border-fuchsia-400 transition-all outline-none"
                    >
                      <option value="String">String</option>
                      <option value="Integer">Integer</option>
                      <option value="Hash160">{{ $t('tools.abiEncoder.typeStringHash160') }}</option>
                      <option value="Hash256">Hash256</option>
                      <option value="ByteArray">{{ $t('tools.abiEncoder.typeByteArrayHex') }}</option>
                      <option value="PublicKey">PublicKey</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Any">Any</option>
                    </select>
                  </div>
                  <div class="w-full sm:w-flex-1 relative">
                    <input
                      type="text"
                      v-model="param.value"
                      class="form-input w-full bg-surface font-mono text-sm pr-10 border-transparent rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20 hover:border-fuchsia-400 focus:border-fuchsia-400 transition-all outline-none"
                      :placeholder="$t('tools.abiEncoder.paramValuePlaceholder')"
                    />
                    <button
                      @click="removeParam(i)"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors"
                      :title="$t('tools.abiEncoder.removeParamTitle')"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </transition-group>
            </div>

            <div class="pt-6 mt-6 flex justify-end border-t border-line-soft">
              <button
                @click="encodeScript"
                :disabled="!encodeForm.contractHash || !encodeForm.method"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-8 py-3 text-sm font-bold text-white hover:bg-fuchsia-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
              >
                {{ $t('tools.abiEncoder.encodeButton') }}
              </button>
            </div>

            <transition name="fade">
              <div
                v-if="encodedResult"
                class="mt-6 p-6 rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white dark:border-fuchsia-900/30 dark:from-fuchsia-900/10 dark:to-slate-900 shadow-sm space-y-4"
              >
                <div>
                  <p
                    class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1.5"
                  >
                    {{ $t('tools.abiEncoder.base64ScriptHeading') }}
                  </p>
                  <p
                    class="text-sm text-high font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner"
                  >
                    {{ encodedResult.base64 }}
                  </p>
                </div>
                <div>
                  <p
                    class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1.5"
                  >
                    {{ $t('tools.abiEncoder.hexScriptHeading') }}
                  </p>
                  <p
                    class="text-sm text-high font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner"
                  >
                    {{ encodedResult.hex }}
                  </p>
                </div>
              </div>
            </transition>
          </template>

          <!-- Decode Mode -->
          <template v-if="activeMode === 'decode'">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-bold text-high tracking-tight">{{ $t('tools.abiEncoder.compiledScriptLabel') }}</label>
                <select
                  v-model="decodeFormat"
                  class="form-input bg-surface text-xs py-1.5 px-3 border-line-soft transition-colors cursor-pointer rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20 hover:border-fuchsia-400 focus:border-fuchsia-400 transition-all outline-none"
                >
                  <option value="base64">Base64</option>
                  <option value="hex">{{ $t('tools.abiEncoder.formatHex') }}</option>
                </select>
              </div>
              <textarea
                v-model="decodeInput"
                class="form-input w-full h-40 bg-surface text-high font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20 hover:border-fuchsia-400 focus:border-fuchsia-400 transition-all outline-none"
                :placeholder="$t('tools.abiEncoder.decodeInputPlaceholder')"
              ></textarea>
            </div>

            <div class="pt-6 flex justify-end border-t border-line-soft">
              <button
                @click="decodeScript"
                :disabled="!decodeInput.trim()"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-8 py-3 text-sm font-bold text-white hover:bg-fuchsia-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
              >
                {{ $t('tools.abiEncoder.decodeButton') }}
              </button>
            </div>

            <transition name="fade">
              <div v-if="decodedResult" class="mt-6 rounded-2xl overflow-hidden border border-line-soft shadow-sm">
                <div
                  v-if="decodedResult.error"
                  class="p-5 bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400 text-sm font-bold flex items-center gap-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  {{ decodedResult.error }}
                </div>
                <div v-else class="bg-surface">
                  <div
                    class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-gradient-to-br from-fuchsia-50/50 to-transparent dark:from-fuchsia-900/10 border-b border-line-soft"
                  >
                    <div>
                      <p
                        class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1"
                      >
                        {{ $t('tools.abiEncoder.contractInvokedHeading') }}
                      </p>
                      <p class="text-sm font-mono text-high font-semibold break-all">
                        {{ decodedResult.contractHash }}
                      </p>
                    </div>
                    <div>
                      <p
                        class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1"
                      >
                        {{ $t('tools.abiEncoder.methodNameHeading') }}
                      </p>
                      <p class="text-sm font-bold text-high">{{ decodedResult.method }}</p>
                    </div>
                  </div>
                  <div class="p-5">
                    <p class="text-[10px] text-mid font-bold uppercase tracking-widest mb-3">{{ $t('tools.abiEncoder.instructionsHeading') }}</p>
                    <div
                      class="max-h-80 overflow-y-auto rounded-xl border border-line-soft bg-surface p-4 text-xs font-mono text-high space-y-1.5 shadow-inner dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <div
                        v-for="(inst, i) in decodedResult.instructions"
                        :key="i"
                        class="mb-1.5 flex gap-4 rounded px-1 pb-1.5 transition-colors last:mb-0 last:border-0 last:pb-0 border-b border-line-soft hover:bg-surface-muted/60 dark:border-slate-800/50 dark:hover:bg-slate-800/50"
                      >
                        <span class="w-8 shrink-0 select-none text-low dark:text-slate-500">{{
                          i.toString().padStart(2, "0")
                        }}</span>
                        <span class="text-fuchsia-400 w-24 shrink-0 font-bold">{{ inst.opcode }}</span>
                        <span class="break-all text-high dark:text-slate-200">{{ inst.operand || "" }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";
import { disassembleScript, extractContractInvocation } from "@/utils/scriptDisassembler";
import { hex2base64 } from "@/utils/sdkCompat";

const { t } = useI18n();
const toast = useToast();
const activeMode = ref("encode");

// Encode State
const encodeForm = ref({
  contractHash: "",
  method: "",
  params: [],
});
const encodedResult = ref(null);

// Decode State
const decodeFormat = ref("base64");
const decodeInput = ref("");
const decodedResult = ref(null);

function addParam() {
  encodeForm.value.params.push({ type: "String", value: "" });
}

function removeParam(index) {
  encodeForm.value.params.splice(index, 1);
}

// --- Neo N3 ABI encoding helpers (pure JS, no SDK dependency) ---

const SYSCALL_CONTRACT_CALL = [0x52, 0x5b, 0x7d, 0x62]; // 0x627d5b52 in LE
const SYSCALL_OPCODE = 0x41;
const PACK_OPCODE = 0xc0;

function _hexToBytes(hex) {
  const h = hex.replace(/^0x/i, "");
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substr(i * 2, 2), 16);
  }
  return bytes;
}

function _pushData(target, data) {
  // data is a Uint8Array or array of byte values
  const len = data.length;
  if (len <= 0xff) {
    target.push(0x0c); // PUSHDATA1
    target.push(len);
  } else if (len <= 0xffff) {
    target.push(0x0d); // PUSHDATA2
    target.push(len & 0xff);
    target.push((len >> 8) & 0xff);
  } else {
    target.push(0x0e); // PUSHDATA4
    target.push(len & 0xff);
    target.push((len >> 8) & 0xff);
    target.push((len >> 16) & 0xff);
    target.push((len >> 24) & 0xff);
  }
  for (let i = 0; i < data.length; i++) {
    target.push(data[i]);
  }
}

function _pushInt(target, num) {
  // Handle native BigInt
  const n = typeof num === "bigint" ? num : BigInt(num);
  if (n === 0n) {
    target.push(0x10); // PUSH0
    return;
  }
  if (n === -1n) {
    target.push(0x0f); // PUSHM1
    return;
  }
  if (n >= 1n && n <= 16n) {
    target.push(0x10 + Number(n)); // PUSH1-PUSH16
    return;
  }

  // Determine minimum signed byte width
  const isNeg = n < 0n;
  const abs = isNeg ? -n : n;
  let byteCount = 0;
  let tmp = abs;
  while (tmp > 0n) {
    byteCount++;
    tmp >>= 8n;
  }
  byteCount = Math.max(byteCount, 1);
  // If positive and high bit would be set, need an extra byte for sign
  if (!isNeg) {
    const highByte = Number((abs >> (8n * BigInt(byteCount - 1))) & 0xffn);
    if (highByte >= 0x80) byteCount++;
  }

  // Map byte count to PUSHINT opcode
  let opcode;
  if (byteCount <= 1) opcode = 0x00; // PUSHINT8
  else if (byteCount <= 2) opcode = 0x01; // PUSHINT16
  else if (byteCount <= 4) opcode = 0x02; // PUSHINT32
  else if (byteCount <= 8) opcode = 0x03; // PUSHINT64
  else if (byteCount <= 16) opcode = 0x04; // PUSHINT128
  else if (byteCount <= 32) opcode = 0x05; // PUSHINT256
  else throw new Error("Integer value too large for Neo VM (max 256 bits)");

  const sizes = [1, 2, 4, 8, 16, 32];
  const size = sizes[opcode];

  target.push(opcode);
  // Encode as two's complement little-endian
  let val = n;
  if (val < 0n) {
    val = (1n << (8n * BigInt(size))) + val;
  }
  for (let i = 0; i < size; i++) {
    target.push(Number(val & 0xffn));
    val >>= 8n;
  }
}

function _encodeParam(target, param) {
  const v = (param.value || "").trim();
  switch (param.type) {
    case "String": {
      _pushData(target, new TextEncoder().encode(v));
      break;
    }
    case "Integer": {
      if (!/^-?\d+$/.test(v)) throw new Error(`Invalid integer: "${v}"`);
      _pushInt(target, BigInt(v));
      break;
    }
    case "Hash160": {
      const hex = v.replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]{40}$/.test(hex))
        throw new Error("Hash160 requires exactly 40 hex characters");
      // Reverse to little-endian script-hash byte order
      const bytes = _hexToBytes(hex);
      _pushData(target, Uint8Array.from(bytes).reverse());
      break;
    }
    case "Hash256": {
      const hex = v.replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]{64}$/.test(hex))
        throw new Error("Hash256 requires exactly 64 hex characters");
      const bytes = _hexToBytes(hex);
      _pushData(target, Uint8Array.from(bytes).reverse());
      break;
    }
    case "ByteArray": {
      const hex = v.replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0)
        throw new Error("ByteArray requires an even-length hex string");
      _pushData(target, _hexToBytes(hex));
      break;
    }
    case "PublicKey": {
      const hex = v.replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]{66}$/.test(hex))
        throw new Error("PublicKey requires exactly 66 hex characters (33 bytes)");
      _pushData(target, _hexToBytes(hex));
      break;
    }
    case "Boolean": {
      const lower = v.toLowerCase();
      if (lower === "true" || lower === "1") {
        target.push(0x08); // PUSHT
      } else {
        target.push(0x09); // PUSHF
      }
      break;
    }
    case "Any": {
      // Auto-detect from value
      const lower = v.toLowerCase();
      if (lower === "true" || lower === "false") {
        _encodeParam(target, { type: "Boolean", value: v });
      } else if (/^-?\d+$/.test(v)) {
        _encodeParam(target, { type: "Integer", value: v });
      } else if (/^(0x)?[0-9a-fA-F]+$/.test(v) && v.replace(/^0x/, "").length % 2 === 0) {
        _encodeParam(target, { type: "ByteArray", value: v });
      } else {
        _encodeParam(target, { type: "String", value: v });
      }
      break;
    }
    default:
      throw new Error(`Unsupported parameter type: ${param.type}`);
  }
}

function encodeScript() {
  try {
    const { contractHash, method, params } = encodeForm.value;

    if (!contractHash || !method) {
      toast.error(t("tools.abiEncoder.toasts.contractAndMethodRequired"));
      return;
    }

    const cleanHash = contractHash.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{40}$/.test(cleanHash)) {
      toast.error(t("tools.abiEncoder.toasts.invalidContractHash"));
      return;
    }

    const script = [];

    // 1. Push parameters in reverse order (last argument first on the stack)
    for (let i = params.length - 1; i >= 0; i--) {
      _encodeParam(script, params[i]);
    }

    // 2. If there are parameters, push count + PACK to form an array
    if (params.length > 0) {
      _pushInt(script, params.length);
      script.push(PACK_OPCODE);
    }

    // 3. Push call flags — 0x0F = All (ReadStates|WriteStates|AllowCall|AllowNotify)
    _pushInt(script, 0x0f);

    // 4. Push method name
    _pushData(script, new TextEncoder().encode(method));

    // 5. Push contract hash (20 bytes, reversed to little-endian)
    const hashBytes = _hexToBytes(cleanHash);
    _pushData(script, Uint8Array.from(hashBytes).reverse());

    // 6. SYSCALL System.Contract.Call
    script.push(SYSCALL_OPCODE);
    for (const b of SYSCALL_CONTRACT_CALL) script.push(b);

    // Convert to hex and base64 output
    const hexScript = Array.from(script, (b) => b.toString(16).padStart(2, "0")).join("");
    const base64Script = btoa(String.fromCharCode(...script));

    encodedResult.value = { base64: base64Script, hex: hexScript };
    toast.success(t("tools.abiEncoder.toasts.encodeSuccess"));
  } catch (err) {
    if (import.meta.env.DEV) console.error(err);
    toast.error(t("tools.abiEncoder.toasts.encodeFailed", { reason: err.message }));
  }
}

function decodeScript() {
  try {
    let input = decodeInput.value.trim();
    let base64Script = "";

    if (decodeFormat.value === "hex") {
      const cleanHex = input.replace(/^0x/, "");
      base64Script = hex2base64(cleanHex);
    } else {
      base64Script = input;
    }

    const instructions = disassembleScript(base64Script);
    const invocation = extractContractInvocation(base64Script);

    if (!invocation) {
      decodedResult.value = {
        error: t("tools.abiEncoder.noInvocationFound"),
        instructions,
      };
    } else {
      decodedResult.value = {
        contractHash: invocation.contractHash,
        method: invocation.method,
        instructions,
      };
    }

    toast.success(t("tools.abiEncoder.toasts.decodeSuccess"));
  } catch (err) {
    if (import.meta.env.DEV) console.error(err);
    decodedResult.value = { error: t("tools.abiEncoder.decodeGenericError") };
    toast.error(t("tools.abiEncoder.toasts.decodeFailed", { reason: err.message }));
  }
}
</script>
