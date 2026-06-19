import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readView(relativePath) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("responsive list views", () => {
  it("renders account rankings as mobile cards below the desktop breakpoint", () => {
    const source = readView("src/views/Account/Accounts.vue");

    expect(source).toContain('import { useMediaQuery } from "@vueuse/core"');
    expect(source).toContain('import MobileListCard from "@/components/common/MobileListCard.vue"');
    expect(source).toContain('const isDesktop = useMediaQuery("(min-width: 768px)")');
    expect(source).toContain('data-testid="accounts-mobile-list"');
    expect(source).toContain('data-testid="account-mobile-card"');
    expect(source).toContain('v-else class="overflow-x-auto"');
  });

  it("renders candidate rows as mobile cards with validator identity", () => {
    const source = readView("src/views/Candidate/Candidates.vue");

    expect(source).toContain('import { useMediaQuery } from "@vueuse/core"');
    expect(source).toContain('import MobileListCard from "@/components/common/MobileListCard.vue"');
    expect(source).toContain('data-testid="candidates-mobile-list"');
    expect(source).toContain('data-testid="candidate-mobile-card"');
    expect(source).toContain("getCandidateAddress(candidate)");
    expect(source).toContain('v-else class="overflow-x-auto"');
  });

  it("renders governance candidates as mobile action cards", () => {
    const source = readView("src/views/Governance/Governance.vue");

    expect(source).toContain('import { useMediaQuery } from "@vueuse/core"');
    expect(source).toContain('import MobileListCard from "@/components/common/MobileListCard.vue"');
    expect(source).toContain('data-testid="governance-mobile-list"');
    expect(source).toContain('data-testid="governance-neoburger-mobile-card"');
    expect(source).toContain('data-testid="governance-candidate-mobile-card"');
    expect(source).toContain("function getCandidateRank(candidate)");
    expect(source).toContain("function getCandidateLiveness(candidate)");
    expect(source).toContain('v-else class="overflow-x-auto"');
  });
});
