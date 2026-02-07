import { getCurrentEnv, NET_ENV } from "./env";

export const CSHARP_COMPILER_VERSIONS = [
  "Neo.Compiler.CSharp 3.0.0",
  "Neo.Compiler.CSharp 3.0.2",
  "Neo.Compiler.CSharp 3.0.3",
  "Neo.Compiler.CSharp 3.1.0",
  "Neo.Compiler.CSharp 3.3.0",
  "Neo.Compiler.CSharp 3.4.0",
  "Neo.Compiler.CSharp 3.5.0",
  "Neo.Compiler.CSharp 3.6.0",
  "Neo.Compiler.CSharp 3.6.2",
];

export const BOA_COMPILER_VERSIONS = [
  "neo3-boa 1.0.1",
  "neo3-boa 0.14.0",
  "neo3-boa 0.13.1",
  "neo3-boa 0.13.0",
  "neo3-boa 0.12.3",
  "neo3-boa 0.12.2",
  "neo3-boa 0.12.1",
  "neo3-boa 0.12.0",
  "neo3-boa 0.11.4",
  "neo3-boa 0.11.3",
  "neo3-boa 0.11.2",
  "neo3-boa 0.11.1",
  "neo3-boa 0.11.0",
  "neo3-boa 0.10.1",
  "neo3-boa 0.10.0",
  "neo3-boa 0.9.0",
  "neo3-boa 0.8.3",
  "neo3-boa 0.8.2",
  "neo3-boa 0.8.1",
  "neo3-boa 0.8.0",
  "neo3-boa 0.7.0",
];

export const LEGACY_CSHARP_COMPILER_VERSIONS = [
  "Neo.Compiler.CSharp 3.0.0",
  "Neo.Compiler.CSharp 3.0.2",
  "Neo.Compiler.CSharp 3.0.3",
];

export const JAVA_COMPILER_VERSION = "neow3j";
export const GO_COMPILER_VERSION = "neo-go";

export const COMPILER_VERSION_OPTIONS = [
  ...CSHARP_COMPILER_VERSIONS.map((version) => ({
    label: version,
    value: version,
  })),
  ...BOA_COMPILER_VERSIONS.map((version) => ({
    label: version.replace("neo3-boa", "Neo3-boa"),
    value: version,
  })),
  { label: "Neow3j (java)", value: JAVA_COMPILER_VERSION },
  { label: "Neo-go (go)", value: GO_COMPILER_VERSION },
];

export const COMPILE_COMMAND_OPTIONS = [
  { label: "nccs", value: "nccs" },
  {
    label: "dotnet build (nccs --debug --no-optimize)",
    value: "nccs --no-optimize",
  },
];

export function isCSharpCompiler(version) {
  return CSHARP_COMPILER_VERSIONS.includes(version);
}

export function isBoaCompiler(version) {
  return BOA_COMPILER_VERSIONS.includes(version);
}

export function isLegacyCSharpCompiler(version) {
  return LEGACY_CSHARP_COMPILER_VERSIONS.includes(version);
}

export function requiresCompileCommand(version) {
  return isCSharpCompiler(version);
}

const UPLOAD_URLS = {
  [NET_ENV.Mainnet]: "https://mainnet.n3magnet.xyz:3027/upload",
  [NET_ENV.TestT5]: "https://n3t5.n3magnet.xyz:3028/upload",
};

const LEGACY_UPLOAD_URLS = {
  [NET_ENV.Mainnet]: "https://neofura.ngd.network/upload",
  [NET_ENV.TestT5]: "https://testmagnet.ngd.network/upload",
};

export function resolveUploadNode(version, env = null) {
  const currentEnv = env || getCurrentEnv();

  if (!UPLOAD_URLS[currentEnv]) return "";

  if (isLegacyCSharpCompiler(version)) {
    return LEGACY_UPLOAD_URLS[currentEnv] || "";
  }

  return UPLOAD_URLS[currentEnv];
}

export function getCompilerUploadHint(version) {
  if (version === JAVA_COMPILER_VERSION) {
    return "Upload your source contract .java files and the project build.gradle file.";
  }

  if (isBoaCompiler(version)) {
    return "Upload all source contract files with .py extension from your project.";
  }

  if (version === GO_COMPILER_VERSION) {
    return "Upload all source contract files with .go extension from your project.";
  }

  if (isCSharpCompiler(version)) {
    return "Upload all source files with .cs and .csproj extensions from your project.";
  }

  return "Select your compiler version to see required source files.";
}

export function getCompilationFailureMessage(version) {
  if (isCSharpCompiler(version)) {
    return "Compilation failed. We could not generate a .nef file from your upload. Please ensure all .cs and .csproj files are included.";
  }

  if (isBoaCompiler(version)) {
    return "Compilation failed. We could not generate a .nef file from your upload. Please ensure all .py files are included.";
  }

  if (version === JAVA_COMPILER_VERSION) {
    return "Compilation failed. We could not generate a .nef file from your upload. Please ensure all .java and .gradle files are included.";
  }

  return "Compilation failed. We could not generate a .nef file from your upload. Please ensure all .go files are included.";
}

export default {
  CSHARP_COMPILER_VERSIONS,
  BOA_COMPILER_VERSIONS,
  LEGACY_CSHARP_COMPILER_VERSIONS,
  COMPILER_VERSION_OPTIONS,
  COMPILE_COMMAND_OPTIONS,
  requiresCompileCommand,
  resolveUploadNode,
  getCompilerUploadHint,
  getCompilationFailureMessage,
  isCSharpCompiler,
  isBoaCompiler,
  isLegacyCSharpCompiler,
};
