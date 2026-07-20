import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

export const NEOX_METADATA = Object.freeze({
  title: "Neo X Explorer | Neo3Scan",
  description:
    "Explore Neo X MainNet and TestNet blocks, transactions, addresses, tokens, contracts, network statistics, and dBFT consensus data.",
  keywords:
    "Neo X, Neo X MainNet, Neo X TestNet, blockchain explorer, blocks, transactions, addresses, tokens, contracts, dBFT",
  image: "https://www.neo3scan.com/img/brand/neo3scan-neox-social.png",
  imageAlt: "Neo3Scan Neo X Explorer homepage with network switching and live network statistics.",
});

function attributePattern(attribute, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${escapedValue}["'])[^>]*>`,
    "gi",
  );
}

function replaceExactlyOnce(html, pattern, replacement, label) {
  const matches = html.match(pattern) || [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label}, found ${matches.length}`);
  }
  return html.replace(pattern, replacement);
}

function replaceMeta(html, attribute, key, outputAttribute, content) {
  return replaceExactlyOnce(
    html,
    attributePattern(attribute, key),
    `<meta ${outputAttribute}="${key}" content="${content}" />`,
    `${attribute}=${key} meta tag`,
  );
}

export function buildNeoXShell(indexHtml) {
  let html = replaceExactlyOnce(
    indexHtml,
    /<title>[^<]*<\/title>/gi,
    `<title>${NEOX_METADATA.title}</title>`,
    "title",
  );
  html = replaceMeta(html, "name", "description", "name", NEOX_METADATA.description);
  html = replaceMeta(html, "name", "keywords", "name", NEOX_METADATA.keywords);
  html = replaceMeta(html, "property", "og:title", "property", NEOX_METADATA.title);
  html = replaceMeta(html, "property", "og:description", "property", NEOX_METADATA.description);
  html = replaceMeta(html, "property", "og:image", "property", NEOX_METADATA.image);
  html = replaceMeta(html, "name", "twitter:card", "name", "summary_large_image");
  html = replaceMeta(html, "name", "twitter:title", "name", NEOX_METADATA.title);
  html = replaceMeta(html, "name", "twitter:description", "name", NEOX_METADATA.description);
  html = replaceMeta(html, "name", "twitter:image", "name", NEOX_METADATA.image);
  html = replaceMeta(html, "property", "og:image:alt", "property", NEOX_METADATA.imageAlt);
  html = replaceMeta(html, "name", "twitter:image:alt", "name", NEOX_METADATA.imageAlt);

  return html;
}

export async function generateRouteShells({ distDir = path.join(PROJECT_ROOT, "dist") } = {}) {
  const indexPath = path.join(distDir, "index.html");
  const neoXPath = path.join(distDir, "x.html");
  const indexHtml = await readFile(indexPath, "utf8");
  const neoXHtml = buildNeoXShell(indexHtml);
  await writeFile(neoXPath, neoXHtml, "utf8");
  return { indexPath, neoXPath };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const result = await generateRouteShells();
  console.log(`Generated Neo X route shell: ${path.relative(PROJECT_ROOT, result.neoXPath)}`);
}
