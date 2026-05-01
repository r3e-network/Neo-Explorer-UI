import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Render translation keys with their interpolation params appended so the
// test can assert both the key and the substituted values:
//   t("foo.bar", { n: 30 })  →  "foo.bar(n=30)"
function fakeT(key, params) {
  if (!params || Object.keys(params).length === 0) return key;
  const entries = Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return `${key}(${entries})`;
}

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: fakeT }),
}));

const routeMock = { params: {}, query: {} };
const routerPushMock = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ push: routerPushMock }),
}));

const uploadVerificationMock = vi.fn();

vi.mock("@/services", () => ({
  contractService: {
    uploadVerification: uploadVerificationMock,
  },
}));

vi.mock("@/utils/contractVerification", () => ({
  COMPILER_VERSION_OPTIONS: [
    { value: "csharp-3.7.4", label: "C# 3.7.4" },
    { value: "java-3.7.0", label: "Java 3.7.0" },
  ],
  COMPILE_COMMAND_OPTIONS: [{ value: "dotnet build", label: "dotnet build" }],
  JAVA_COMPILER_VERSION: "java-3.7.0",
  requiresCompileCommand: (v) => v === "csharp-3.7.4",
  resolveUploadNode: (v) => (v ? "https://verify.example/api" : null),
  getCompilerUploadHint: () => "",
  getCompilationFailureMessage: () => "compilation failed",
}));

vi.mock("@/constants", () => ({
  VERIFICATION_RESULT: {
    SUCCESS: 0,
    COMPILATION_FAILURE: 1,
    SERVER_ERROR_0: 2,
    SERVER_ERROR_1: 3,
    SERVER_ERROR_3: 4,
    CONTRACT_NOT_FOUND: 5,
  },
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = fakeT;
  },
};

function buildFile(name, sizeBytes) {
  // Avoid actually allocating large memory — fake a Blob-like object Vue can
  // use; the component only reads `.name` and `.size`.
  return { name, size: sizeBytes, type: "text/plain" };
}

async function mountVerifyContract() {
  const VerifyContract = (await import("@/views/Contract/VerifyContract.vue")).default;
  return mount(VerifyContract, {
    global: {
      plugins: [i18nPlugin],
      stubs: {
        Breadcrumb: true,
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
}

describe("VerifyContract upload validation", () => {
  beforeEach(() => {
    routeMock.params = {};
    routerPushMock.mockReset();
    uploadVerificationMock.mockReset();
  });

  it("renders the page without throwing", async () => {
    const wrapper = await mountVerifyContract();
    await flushPromises();
    // Form fields are present
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it("rejects more than 30 files in one selection", async () => {
    const wrapper = await mountVerifyContract();
    const files = Array.from({ length: 31 }, (_, i) => buildFile(`f${i}.cs`, 100));
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: files, configurable: true });
    await input.trigger("change");
    expect(wrapper.text()).toContain("tools.verifyContract.errors.maxFiles");
    expect(wrapper.text()).toContain("max=30");
  });

  it("rejects a single file larger than 10 MB", async () => {
    const wrapper = await mountVerifyContract();
    const tooBig = buildFile("huge.cs", 11 * 1024 * 1024);
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: [tooBig], configurable: true });
    await input.trigger("change");
    expect(wrapper.text()).toContain("tools.verifyContract.errors.fileTooLarge");
    expect(wrapper.text()).toContain("name=huge.cs");
    expect(wrapper.text()).toContain("limitMb=10");
  });

  it("rejects when total size exceeds 50 MB", async () => {
    const wrapper = await mountVerifyContract();
    // Six files at 9MB each = 54MB total, none over the per-file limit
    const files = Array.from({ length: 6 }, (_, i) => buildFile(`big${i}.cs`, 9 * 1024 * 1024));
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: files, configurable: true });
    await input.trigger("change");
    expect(wrapper.text()).toContain("tools.verifyContract.errors.totalTooLarge");
    expect(wrapper.text()).toContain("limitMb=50");
  });
});

describe("VerifyContract source-level invariants", () => {
  it("guards FormData submission behind canSubmit", async () => {
    // Read the source to verify the early-return check exists. Cheap defense
    // against a future refactor that drops the gate.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Contract/VerifyContract.vue"),
      "utf8",
    );
    expect(src).toMatch(/if\s*\(!canSubmit\.value\)\s*return/);
  });

  it("throws localized invalidHash key on bad contract hash", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Contract/VerifyContract.vue"),
      "utf8",
    );
    expect(src).toMatch(/tools\.verifyContract\.errors\.invalidHash/);
  });

  it("uses CONTRACT_HASH_PATTERN to validate hex format", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Contract/VerifyContract.vue"),
      "utf8",
    );
    expect(src).toMatch(/const CONTRACT_HASH_PATTERN = \/.*\[0-9a-fA-F\]\{40\}/);
  });
});
