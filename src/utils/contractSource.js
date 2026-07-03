import { sanitizeHttpUrl } from "@/utils/urlSafety";

const SOURCE_KEYS = ["Sourcecode", "sourcecode", "SourceCode", "sourceCode", "Source", "source"];
const SOURCE_EXTENSIONS = new Set([
  ".cs",
  ".csproj",
  ".json",
  ".xml",
  ".py",
  ".go",
  ".java",
  ".kt",
  ".js",
  ".ts",
  ".rs",
  ".md",
  ".yml",
  ".yaml",
]);
const DEFAULT_MAX_FILES = 8;
const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 12000;

export function getManifestSourceUrl(manifest) {
  const extra = normalizeManifestExtra(manifest?.extra);
  for (const key of SOURCE_KEYS) {
    const candidate = sanitizeHttpUrl(extra[key]);
    if (candidate) return candidate;
  }
  return "";
}

export async function fetchExternalContractSource(
  sourceUrl,
  {
    fetchImpl = globalThis.fetch,
    maxFiles = DEFAULT_MAX_FILES,
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const safeUrl = sanitizeHttpUrl(sourceUrl);
  if (!safeUrl || typeof fetchImpl !== "function") return [];

  const githubSource = parseGitHubSource(safeUrl);
  if (githubSource?.kind === "file") {
    return [await fetchSourceFile(githubSource.rawUrl, { fetchImpl, maxBytes, timeoutMs, filename: githubSource.path })];
  }
  if (githubSource?.kind === "repo") {
    return fetchGitHubSourceFiles(githubSource, { fetchImpl, maxFiles, maxBytes, timeoutMs });
  }

  return [await fetchSourceFile(safeUrl, { fetchImpl, maxBytes, timeoutMs })];
}

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

function parseGitHubSource(input) {
  const url = new URL(input);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "raw.githubusercontent.com" && parts.length >= 4) {
    const path = parts.slice(3).join("/");
    return { kind: "file", rawUrl: url.toString(), path };
  }

  if (host !== "github.com" || parts.length < 2) return null;

  const [owner, repo, mode, ref, ...pathParts] = parts;
  if ((mode === "blob" || mode === "raw") && ref && pathParts.length) {
    const path = pathParts.join("/");
    return {
      kind: "file",
      rawUrl: `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${pathParts.map(encodeURIComponent).join("/")}`,
      path,
    };
  }

  if (mode === "tree" && ref) {
    return {
      kind: "repo",
      owner,
      repo,
      ref,
      pathPrefix: pathParts.join("/"),
    };
  }

  return {
    kind: "repo",
    owner,
    repo,
    ref: "",
    pathPrefix: "",
  };
}

async function fetchGitHubSourceFiles(source, options) {
  const ref = source.ref || (await fetchGitHubDefaultBranch(source, options));
  const treeUrl = `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const tree = await fetchJson(treeUrl, options);
  const prefix = source.pathPrefix ? `${source.pathPrefix.replace(/\/+$/, "")}/` : "";
  const candidates = (Array.isArray(tree?.tree) ? tree.tree : [])
    .filter((item) => item?.type === "blob" && item.path)
    .filter((item) => !prefix || item.path.startsWith(prefix))
    .filter((item) => isLikelySourceFile(item.path))
    .sort(compareSourcePriority)
    .slice(0, options.maxFiles);

  const files = await Promise.all(
    candidates.map((item) =>
      fetchSourceFile(`https://raw.githubusercontent.com/${source.owner}/${source.repo}/${ref}/${item.path}`, {
        ...options,
        filename: item.path,
      }),
    ),
  );
  return files.filter(Boolean);
}

async function fetchGitHubDefaultBranch(source, options) {
  const repo = await fetchJson(
    `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`,
    options,
  );
  return repo?.default_branch || "main";
}

async function fetchJson(url, { fetchImpl, timeoutMs }) {
  const response = await fetchWithTimeout(fetchImpl, url, {
    timeoutMs,
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`Unable to load GitHub source metadata (${response.status}).`);
  return response.json();
}

async function fetchSourceFile(url, { fetchImpl, maxBytes, timeoutMs, filename = "" }) {
  const safeUrl = sanitizeHttpUrl(url);
  if (!safeUrl) throw new Error("Invalid source URL.");

  const response = await fetchWithTimeout(fetchImpl, safeUrl, {
    timeoutMs,
    headers: { Accept: "text/plain, application/json, application/xml, */*;q=0.8" },
  });
  if (!response.ok) throw new Error(`Unable to load source file (${response.status}).`);

  const declaredLength = Number.parseInt(response.headers?.get?.("content-length") || "0", 10);
  if (declaredLength > maxBytes) throw new Error("Source file is too large to preview.");

  const code = await response.text();
  if (code.length > maxBytes) throw new Error("Source file is too large to preview.");

  const resolvedFilename = filename || filenameFromUrl(response.url || safeUrl);
  return {
    filename: resolvedFilename || "Source",
    code,
    sourceUrl: response.url || safeUrl,
    language: languageFromFilename(resolvedFilename || safeUrl),
  };
}

async function fetchWithTimeout(fetchImpl, url, { timeoutMs, headers }) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetchImpl(url, {
      headers,
      signal: controller?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function filenameFromUrl(input) {
  try {
    const url = new URL(input);
    const parts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    if (url.hostname.toLowerCase() === "raw.githubusercontent.com" && parts.length > 3) {
      return parts.slice(3).join("/");
    }
    return parts.at(-1) || "Source";
  } catch {
    return "Source";
  }
}

function isLikelySourceFile(path) {
  return SOURCE_EXTENSIONS.has(extensionFromFilename(path));
}

function extensionFromFilename(filename = "") {
  const basename = filename.toLowerCase().split(/[/?#]/)[0];
  const match = basename.match(/(\.[a-z0-9]+)$/);
  return match?.[1] || "";
}

function compareSourcePriority(a, b) {
  return sourcePriority(a.path) - sourcePriority(b.path) || a.path.localeCompare(b.path);
}

function sourcePriority(path = "") {
  const lower = path.toLowerCase();
  if (lower.endsWith(".cs")) return 0;
  if (lower.endsWith(".csproj")) return 1;
  if (lower.endsWith(".json")) return 2;
  if (lower.includes("readme")) return 8;
  return 5;
}

export function languageFromFilename(filename = "") {
  const ext = extensionFromFilename(filename);
  if (ext === ".cs") return "csharp";
  if (ext === ".csproj" || ext === ".xml") return "xml";
  if (ext === ".json") return "json";
  if (ext === ".py") return "python";
  if (ext === ".go") return "go";
  if (ext === ".java") return "java";
  if (ext === ".kt") return "kotlin";
  if (ext === ".js") return "javascript";
  if (ext === ".ts") return "typescript";
  if (ext === ".rs") return "rust";
  if (ext === ".md") return "markdown";
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  return "plaintext";
}
