import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  NEOX_METADATA,
  buildNeoXShell,
  generateRouteShells,
} from "../../scripts/generate-route-shells.mjs";

const PROJECT_ROOT = process.cwd();
const temporaryDirectories = [];

function occurrences(value, pattern) {
  return (value.match(pattern) || []).length;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Neo X route shell", () => {
  it("replaces crawler metadata while keeping the shared app entry", async () => {
    const source = await readFile(path.join(PROJECT_ROOT, "index.html"), "utf8");
    const shell = buildNeoXShell(source);

    expect(shell).toContain(`<title>${NEOX_METADATA.title}</title>`);
    expect(shell).toContain(`name="description" content="${NEOX_METADATA.description}"`);
    expect(shell).toContain(`property="og:image" content="${NEOX_METADATA.image}"`);
    expect(shell).toContain(`name="twitter:image" content="${NEOX_METADATA.image}"`);
    expect(shell).not.toContain('rel="canonical"');
    expect(shell).not.toContain('property="og:url"');
    expect(shell).toContain('property="og:image:width" content="1200"');
    expect(shell).toContain('property="og:image:height" content="630"');
    expect(shell).toContain('<script type="module" src="/src/main.js"></script>');
    expect(shell).not.toContain("oneGate.png");
    expect(occurrences(shell, /<title>/g)).toBe(1);
    expect(occurrences(shell, /(?:name|property)="twitter:title"/g)).toBe(1);
  });

  it("writes x.html without changing the built N3 shell", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "neo3scan-shells-"));
    temporaryDirectories.push(directory);
    const source = await readFile(path.join(PROJECT_ROOT, "index.html"), "utf8");
    await writeFile(path.join(directory, "index.html"), source, "utf8");

    await generateRouteShells({ distDir: directory });

    const unchangedIndex = await readFile(path.join(directory, "index.html"), "utf8");
    const neoXShell = await readFile(path.join(directory, "x.html"), "utf8");
    expect(unchangedIndex).toBe(source);
    expect(neoXShell).toBe(buildNeoXShell(source));
  });

  it("ships a valid 1200 by 630 PNG card", async () => {
    const imagePath = path.join(PROJECT_ROOT, "public/img/brand/neo3scan-neox-social.png");
    const metadata = await sharp(imagePath).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });

  it("routes Neo X pages to x.html before the generic SPA fallback", async () => {
    const config = JSON.parse(await readFile(path.join(PROJECT_ROOT, "vercel.json"), "utf8"));
    const exactIndex = config.rewrites.findIndex((rewrite) => rewrite.source === "/x");
    const nestedIndex = config.rewrites.findIndex((rewrite) => rewrite.source === "/x/:path*");
    const fallbackIndex = config.rewrites.findIndex((rewrite) => rewrite.destination === "/index.html");

    expect(config.rewrites[exactIndex]).toEqual({ source: "/x", destination: "/x.html" });
    expect(config.rewrites[nestedIndex]).toEqual({ source: "/x/:path*", destination: "/x.html" });
    expect(exactIndex).toBeGreaterThan(-1);
    expect(nestedIndex).toBeGreaterThan(exactIndex);
    expect(fallbackIndex).toBeGreaterThan(nestedIndex);
    expect(config.rewrites).toContainEqual({ source: "/neox/:net/:path*", destination: "/api/neox" });
  });
});
