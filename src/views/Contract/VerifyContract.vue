<template>
  <div class="verify-contract-page">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
          <button class="text-current opacity-60 hover:opacity-100" @click="notification = null">&times;</button>
        </div>
      </div>
    </Transition>

    <section class="mx-auto max-w-[1400px] px-4 py-6">
      <nav class="mb-4 flex items-center text-sm text-text-secondary dark:text-gray-400">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/contracts/1" class="hover:text-primary-500">Contracts</router-link>
        <span class="mx-2">/</span>
        <span class="text-text-primary dark:text-gray-300">Verify</span>
      </nav>

      <div class="etherscan-card">
        <header class="border-b border-card-border p-5 dark:border-card-border-dark md:p-6">
          <h1 class="text-xl font-semibold text-text-primary dark:text-gray-100 md:text-2xl">
            Verify & Publish Contract Source Code
          </h1>
          <p class="mt-2 text-sm text-text-secondary dark:text-gray-400">
            Upload the exact source files used at deployment time. The explorer recompiles and matches the generated
            bytecode with the deployed contract.
          </p>
        </header>

        <div class="grid gap-6 p-5 md:p-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
          <form @submit.prevent="uploadFilesAndParams" class="space-y-5">
            <div>
              <label class="form-label">Contract Hash <span class="text-red-500">*</span></label>
              <input v-model="form.hash" type="text" placeholder="0x..." class="form-input" />
              <p v-if="errors.hash" class="form-error">{{ errors.hash }}</p>
            </div>

            <div>
              <label class="form-label">Compiler Version <span class="text-red-500">*</span></label>
              <select v-model="form.version" class="form-input">
                <option value="" disabled>Select your compiler version</option>
                <option v-for="option in compilerVersionOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p v-if="errors.version" class="form-error">{{ errors.version }}</p>
            </div>

            <div v-if="showCompileCommand">
              <label class="form-label">Compile Command <span class="text-red-500">*</span></label>
              <select v-model="form.command" class="form-input">
                <option value="" disabled>Select your compile command</option>
                <option v-for="option in compileCommandOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p v-if="errors.command" class="form-error">{{ errors.command }}</p>
            </div>

            <div>
              <label class="form-label">Source Code Files <span class="text-red-500">*</span></label>
              <div class="flex flex-wrap items-center gap-3">
                <label
                  class="inline-flex items-center rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-primary-500 transition-colors dark:border-card-border-dark dark:hover:bg-gray-800 cursor-pointer"
                >
                  Select Files
                  <input
                    ref="fileInput"
                    type="file"
                    :accept="accept"
                    multiple
                    class="hidden"
                    @change="onFilesSelected"
                  />
                </label>
                <button
                  type="submit"
                  :disabled="!canUpload"
                  class="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload &amp; Verify
                </button>
              </div>
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
                  <button type="button" @click="removeFile(idx)" class="text-red-400 hover:text-red-600">
                    &times;
                  </button>
                </div>
              </div>
            </div>
          </form>

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
              v-if="form.version === javaCompilerVersion"
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

<script>
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

export default {
  name: "VerifyContract",
  data() {
    return {
      isLoading: false,
      fileList: [],
      notification: null,
      errors: {},
      accept: ".cs,.csproj,.py,.java,.gradle,.go",
      form: {
        hash: "",
        version: "",
        command: "",
      },
      javaPackage: "io.examples.HelloWorld",
      isContractPattern: /^((0x)?)([0-9a-f]{40})$/,
      compilerVersionOptions: COMPILER_VERSION_OPTIONS,
      compileCommandOptions: COMPILE_COMMAND_OPTIONS,
      javaCompilerVersion: JAVA_COMPILER_VERSION,
    };
  },
  created() {
    this.form.hash = this.$route.params.contractHash || "";
  },
  computed: {
    showCompileCommand() {
      return requiresCompileCommand(this.form.version);
    },
    canUpload() {
      const baseReady = Boolean(this.form.hash && this.form.version && this.fileList.length);
      if (!baseReady) {
        return false;
      }

      if (this.showCompileCommand && !this.form.command) {
        return false;
      }

      return true;
    },
    compilerUploadHint() {
      return getCompilerUploadHint(this.form.version);
    },
    notificationClass() {
      const type = this.notification?.type || "error";
      const map = {
        success:
          "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200",
        warning:
          "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
        error: "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
      };
      return map[type] || map.error;
    },
  },
  watch: {
    "form.version"(nextVersion) {
      if (!requiresCompileCommand(nextVersion)) {
        this.form.command = "";
      }
    },
  },
  methods: {
    showNotification(type, message) {
      this.notification = { type, message };
    },

    async uploadFilesAndParams() {
      if (!this.canUpload) return;

      this.errors = {};
      if (!this.isContractPattern.test(this.form.hash)) {
        this.errors.hash = "Invalid format. Must be a 40-character hex string.";
        return;
      }

      const node = resolveUploadNode(this.form.version);
      if (!node) {
        this.showNotification("error", "Unsupported host for contract verification endpoint.");
        return;
      }

      const formData = new FormData();
      this.fileList.forEach((file) => formData.append("file", file));
      formData.append("Contract", this.form.hash);
      formData.append("Version", this.form.version);

      if (this.showCompileCommand && this.form.command) {
        formData.append("CompileCommand", this.form.command);
      }
      if (this.form.version === this.javaCompilerVersion) {
        formData.append("JavaPackage", this.javaPackage);
      }

      this.isLoading = true;
      try {
        const data = await contractService.uploadVerification(node, formData);
        this.handleUploadResult(data);
      } catch {
        this.showNotification("error", "Server error, please try again later.");
      } finally {
        this.isLoading = false;
      }
    },

    handleUploadResult(result) {
      const code = result?.Code;

      if (code === 2) {
        this.showNotification("error", getCompilationFailureMessage(this.form.version));
        return;
      }
      if (code === 0 || code === 1 || code === 3) {
        this.showNotification("error", "Server error, please try again later.");
        return;
      }
      if (code === 4) {
        this.showNotification("error", `Failed in querying contract info on blockChain. ${result?.Msg || ""}`);
        return;
      }
      if (code === 5) {
        this.showNotification("success", "Contract verification succeeded!");
        this.$router.push(`/contractinfo/${this.form.hash}`);
        return;
      }
      if (code === 6) {
        this.showNotification("warning", "This contract has already been verified.");
        return;
      }
      if (code === 7) {
        this.showNotification("error", result?.Msg || "Verification failed.");
        return;
      }

      this.showNotification("error", "Verification failed. Source code does not match deployed bytecode.");
    },

    onFilesSelected(event) {
      const files = Array.from(event.target.files || []);
      this.fileList = [...this.fileList, ...files];
      if (this.$refs.fileInput) this.$refs.fileInput.value = "";
    },

    removeFile(index) {
      this.fileList.splice(index, 1);
    },
  },
};
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
