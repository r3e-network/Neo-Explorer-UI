import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const readFile = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("Consensus Status page wiring", () => {
  it("is reachable from routing and both desktop/mobile blockchain navigation", () => {
    const routerSource = readFile("src/router/index.js");
    const desktopNavSource = readFile("src/components/layout/DesktopNav.vue");
    const appHeaderSource = readFile("src/components/layout/AppHeader.vue");

    expect(routerSource).toContain('import("../views/ConsensusStatus/ConsensusStatus.vue")');
    expect(routerSource).toContain('path: "/consensus-status"');
    expect(routerSource).toContain('titleKey: "pageTitles.consensusStatus"');
    expect(desktopNavSource).toContain('to="/consensus-status"');
    expect(desktopNavSource).toContain('nav.consensusStatus');
    expect(appHeaderSource).toContain('to="/consensus-status"');
    expect(appHeaderSource).toContain('nav.consensusStatus');
  });
});
