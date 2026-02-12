<template>
  <div class="verify-contract-page">
    <!-- Loading overlay -->
    <div v-if="loading" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="flex flex-col items-center rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
        <p class="mt-3 text-sm text-text-secondary dark:text-gray-400">Verifying contract...</p>
      </div>
    </div>

    <!-- Toast notification -->
    <Transition name="slide-in">
      <div v-if="notification" class="fixed right-4 top-4 z-50 max-w-md">
        <div class="flex items-start gap-3 rounded-lg border p-4 shadow-lg" :class="notificationClass">
          <p class="flex-1 text-sm">{{ notification.message }}</p>
          <button
            class="text-current opacity-60 hover:opacity-100"
            aria-label="Dismiss notification"
            @click="notification = null"
          >
            &times;
          </button>
        </div>
      </div>
    </Transition>

    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[{ label: 'Home', to: '/homepage' }, { label: 'Contracts', to: '/contracts/1' }, { label: 'Verify' }]"
      />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Verify Contract</h1>
          <p class="page-subtitle">Submit contract source code for verification</p>
        </div>
      </div>

      <div class="etherscan-card">
        <!-- Form + Sidebar -->
        <div class="grid gap-6 p-5 md:p-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
          <form @submit.prevent="submitVerification" class="space-y-5">
            <!-- Contract Hash -->
            <div>
              <label class="form-label">Contract Hash <span class="text-red-500">*</span></label>
              <input
                v-model="form.hash"
                type="text"
                placeholder="0x..."
                required
                aria-label="Contract hash"
                class="form-input"
              />
              <p v-if="errors.hash" class="form-error">{{ errors.hash }}</p>
            </div>

            <!-- Compiler Version -->
            <div>
              <label class="form-label">Compiler Version <span class="text-red-500">*</span></label>
              <select v-model="form.version" required class="form-input">
                <option value="" disabled>Select your compiler version</option>
                <option v-for="option in compilerVersionOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p v-if="errors.version" class="form-error">{{ errors.version }}</p>
            </div>

            <!-- Compile Command (conditional) -->
            <div v-if="showCompileCommand">
              <label class="form-label">Compile Command <span class="text-red-500">*</span></label>
              <select v-model="form.command" required class="form-input">
                <option value="" disabled>Select your compile command</option>
                <option v-for="option in compileCommandOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p v-if="errors.command" class="form-error">{{ errors.command }}</p>
            </div>

            <!-- File Upload -->
            <div>
              <label class="form-label">Source Code Files <span class="text-red-500">*</span></label>
              <div class="flex flex-wrap items-center gap-3">
                <label
                  class="btn-outline inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Select Files
                  <input
                    ref="fileInputRef"
                    type="file"
                    :accept="acceptedExtensions"
                    multiple
                    aria-label="Select source code files"
                    class="hidden"
                    @change="onFilesSelected"
                  />
                </label>
                <button
                  type="submit"
                  :disabled="!canSubmit"
                  class="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Upload & Verify
                </button>
              </div>

              <!-- File list -->
              <div v-if="fileList.length" class="mt-3 space-y-1">
                <div
                  v-for="(file, idx) in fileList"
                  :key="idx"
                  class="flex items-center gap-2 text-sm text-text-primary dark:text-gray-300"
                >
                  <svg class="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>{{ file.name }}</span>
                  <button
                    type="button"
                    @click="removeFile(idx)"
                    :aria-label="`Remove file ${file.name}`"
                    class="text-red-400 hover:text-red-600"
                  >
                    &times;
                  </button>
                </div>
              </div>
            </div>
          </form>

          <!-- Sidebar Tips -->
          <aside
            class="rounded-lg border border-card-border bg-gray-50 p-4 text-sm dark:border-card-border-dark dark:bg-gray-900/40"
          >
            <h2 class="mb-3 font-semibold text-text-primary dark:text-gray-100">Submission Tips</h2>
            <ul class="space-y-2 text-text-secondary dark:text-gray-300">
              <li>{{ compilerUploadHint }}</li>
              <li>Contract hash must be a 40-character hex string.</li>
              <li>
                Keep source files unchanged from deployment build. Any source or compiler mismatch causes verification
                failure.
              </li>
            </ul>

            <div
              v-if="form.version === JAVA_COMPILER_VERSION"
              class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"
            >
              The <span class="font-semibold">className</span> property in
              <span class="font-semibold">build.gradle</span> must match the contract's fully-qualified Java class name.
            </div>
          </aside>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { contractService } from "@/services";
import {
  COMPILER_VERSION_OPTIONS,
  COMPILE_COMMAND_OPTIONS,
  JAVA_COMPILER_VERSION,
  requiresCompileCommand,
  resolveUploadNode,
  getCompilerUploadHint,
  getCompilationFailureMessage,
} from "@/utils/contractVerification";

const route = useRoute();
const router = useRouter();
const fileInputRef = ref(null);

const CONTRACT_HASH_PATTERN = /^((0x)?)([0-9a-f]{40})$/;

// Form state
const loading = ref(false);
const notification = ref(null);
const errors = ref({});
const fileList = ref([]);
const form = ref({
  hash: route.params.contractHash || "",
  version: "",
  command: "",
});

// Constants exposed to template
const compilerVersionOptions = COMPILER_VERSION_OPTIONS;
const compileCommandOptions = COMPILE_COMMAND_OPTIONS;
const acceptedExtensions = ".cs,.csproj,.py,.java,.gradle,.go";

// Computed
const showCompileCommand = computed(() => requiresCompileCommand(form.value.version));

const canSubmit = computed(() => {
  const base = Boolean(form.value.hash && form.value.version && fileList.value.length);
  if (!base) return false;
  if (showCompileCommand.value && !form.value.command) return false;
  return true;
});

const compilerUploadHint = computed(() => getCompilerUploadHint(form.value.version));

const notificationClass = computed(() => {
  const type = notification.value?.type || "error";
  const map = {
    success:
      "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200",
    warning:
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    error: "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
  };
  return map[type] || map.error;
});

// Reset compile command when compiler changes
watch(
  () => form.value.version,
  (v) => {
    if (!requiresCompileCommand(v)) {
      form.value.command = "";
    }
  }
);

// Methods
function showNotification(type, message) {
  notification.value = { type, message };
}

function onFilesSelected(event) {
  const files = Array.from(event.target.files || []);
  fileList.value = [...fileList.value, ...files];
  if (fileInputRef.value) fileInputRef.value.value = "";
}

function removeFile(index) {
  fileList.value.splice(index, 1);
}

async function submitVerification() {
  if (!canSubmit.value) return;

  errors.value = {};
  if (!CONTRACT_HASH_PATTERN.test(form.value.hash)) {
    errors.value.hash = "Invalid format. Must be a 40-character hex string.";
    return;
  }

  const node = resolveUploadNode(form.value.version);
  if (!node) {
    showNotification("error", "Unsupported host for contract verification endpoint.");
    return;
  }

  const formData = new FormData();
  fileList.value.forEach((file) => formData.append("file", file));
  formData.append("Contract", form.value.hash);
  formData.append("Version", form.value.version);

  if (showCompileCommand.value && form.value.command) {
    formData.append("CompileCommand", form.value.command);
  }
  if (form.value.version === JAVA_COMPILER_VERSION) {
    formData.append("JavaPackage", "io.examples.HelloWorld");
  }

  loading.value = true;
  try {
    const data = await contractService.uploadVerification(node, formData);
    handleResult(data);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("Contract verification failed:", err);
    showNotification("error", "Server error, please try again later.");
  } finally {
    loading.value = false;
  }
}

function handleResult(result) {
  const code = result?.Code;

  if (code === 2) {
    showNotification("error", getCompilationFailureMessage(form.value.version));
    return;
  }
  if (code === 0 || code === 1 || code === 3) {
    showNotification("error", "Server error, please try again later.");
    return;
  }
  if (code === 4) {
    showNotification("error", `Failed in querying contract info on blockChain. ${result?.Msg || ""}`);
    return;
  }
  if (code === 5) {
    showNotification("success", "Contract verification succeeded!");
    router.push(`/contract-info/${form.value.hash}`);
    return;
  }
  if (code === 6) {
    showNotification("warning", "This contract has already been verified.");
    return;
  }
  if (code === 7) {
    showNotification("error", result?.Msg || "Verification failed.");
    return;
  }

  showNotification("error", "Verification failed. Source code does not match deployed bytecode.");
}
</script>

<style scoped>
.slide-in-enter-active,
.slide-in-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-in-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-in-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
