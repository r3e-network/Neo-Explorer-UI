// Neo X service bundle. Mirrors the N3 service naming so /x views consume an
// interface analogous to the existing services, but backed by Blockscout REST.
// Phase 2 swaps blockscoutClient's backend for a self-hosted neox fura with no
// change to these services' signatures or the views.

import { blockService } from "./blockService";
import { transactionService } from "./transactionService";
import { accountService } from "./accountService";
import { tokenService } from "./tokenService";
import { contractService } from "./contractService";
import { statsService } from "./statsService";
import { searchService } from "./searchService";

export const neoxServices = {
  blockService,
  transactionService,
  accountService,
  tokenService,
  contractService,
  statsService,
  searchService,
};

export { blockService, transactionService, accountService, tokenService, contractService, statsService, searchService };

export default neoxServices;
