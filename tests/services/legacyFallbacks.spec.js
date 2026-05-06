import { describe, expect, it } from "vitest";
import { addressToScriptHash, publicKeyToAddress } from "@/utils/neoHelpers";
import { GAS_HASH, NEO_HASH } from "@/constants";
import {
  mapAccountOverviewRowsToAccounts,
  mapRpcCandidatesToCandidateRows,
  mapDailyAnalyticsToTransactionSeries,
} from "@/services/legacyFallbacks";

describe("legacy fallback helpers", () => {
  it("maps indexed account overview rows into account list rows", () => {
    // The Postgres-backed v_account_overview view returns addresses in the
    // canonical base58 form (case-preserved). Balance rows match by the same
    // address.
    const address = "NL2K2d2zHpQmsvDtY2vRMyhW6Fg7kgsfrE";
    const rows = [
      {
        address,
        tx_sent: 12,
        tx_signed: 34,
        nep11_sent_events: 5,
        nep11_received_events: 7,
        last_tx_ms: 1234567890,
      },
    ];
    const balances = [
      { address, contract_hash: NEO_HASH, balance_raw: "42" },
      { address, contract_hash: GAS_HASH, balance_raw: "123000000" },
    ];

    const mapped = mapAccountOverviewRowsToAccounts(rows, balances);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      address,
      neobalance: "42",
      gasbalance: "123000000",
      txCount: 46,
      nep11TransferCount: 12,
      lastTransactionTime: 1234567890,
    });
    // scripthash should be the canonical 0x... derived from the address.
    expect(mapped[0].scripthash).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it("maps native getcandidates rows into explorer candidate rows", () => {
    const publickey = "023e9b32ea89b94d066e649b124fd50e396ee91369e8e2a6ae1b11c170d022256d";

    const mapped = mapRpcCandidatesToCandidateRows([
      {
        publickey,
        votes: "2365673",
        active: true,
      },
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      publickey,
      votes: "2365673",
      isCommittee: true,
      candidate: addressToScriptHash(publicKeyToAddress(publickey)),
    });
  });

  it("maps sparse analytics rows into a continuous transaction series", () => {
    const rows = [
      { day: "2026-03-23", tx_count: 10 },
      { day: "2026-03-25", tx_count: 30 },
    ];

    const mapped = mapDailyAnalyticsToTransactionSeries(rows, 3, new Date("2026-03-25T12:00:00Z"));

    expect(mapped).toEqual([
      { date: "2026-03-23", transactions: 10 },
      { date: "2026-03-24", transactions: 0 },
      { date: "2026-03-25", transactions: 30 },
    ]);
  });
});
