import { describe, it, expect } from "vitest";
import { toPlainUnits, buildXBlocksCsv, buildXTransactionsCsv } from "../../src/utils/neoxExport.js";

const TS = Date.UTC(2026, 6, 21, 8, 30, 5); // 2026-07-21T08:30:05.000Z

function makeBlock(overrides = {}) {
  return {
    index: 4821001,
    hash: "0xb10c",
    timestampMs: TS,
    txCount: 7,
    gasUsed: "1234567",
    gasLimit: "30000000",
    baseFeePerGas: "25000000000",
    burntFees: "1500000000000000000",
    primaryValidator: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    miner: null,
    size: 2048,
    ...overrides,
  };
}

function makeTx(overrides = {}) {
  return {
    hash: "0xdeadbeef",
    blockIndex: 4821001,
    timestampMs: TS,
    status: "ok",
    method: "transfer",
    sender: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    createdContract: null,
    value: "1234567890000000000",
    fee: "21000000000000",
    gasPrice: "42940000000",
    ...overrides,
  };
}

describe("neoxExport toPlainUnits", () => {
  it("converts a known wei value with 18-decimal exactness and no grouping", () => {
    expect(toPlainUnits("1234567890000000000", 18)).toBe("1.23456789");
    expect(toPlainUnits("1000000000000000000", 18)).toBe("1");
    // 10^30 wei = 10^12 GAS — BigInt-exact and NOT "1,000,000,000,000".
    expect(toPlainUnits("1000000000000000000000000000000", 18)).toBe("1000000000000");
  });

  it("keeps full fractional precision instead of display rounding", () => {
    expect(toPlainUnits("1", 18)).toBe("0.000000000000000001");
    expect(toPlainUnits("-1500000000000000000", 18)).toBe("-1.5");
  });

  it("handles gwei decimals and empty/invalid input", () => {
    expect(toPlainUnits("42940000000", 9)).toBe("42.94");
    expect(toPlainUnits(null, 18)).toBe("");
    expect(toPlainUnits("", 18)).toBe("");
    expect(toPlainUnits("junk", 18)).toBe("");
  });
});

describe("neoxExport buildXBlocksCsv", () => {
  it("emits the exact header row", () => {
    expect(buildXBlocksCsv([]).split("\r\n")[0]).toBe(
      "height,hash,timestamp_iso,tx_count,gas_used,gas_limit,base_fee_gwei,burnt_fees_gas,primary_validator,size_bytes"
    );
  });

  it("maps a block row with ISO timestamp and converted fee columns", () => {
    const [, row] = buildXBlocksCsv([makeBlock()], { net: "neox-mainnet" }).split("\r\n");
    expect(row).toBe(
      "4821001,0xb10c,2026-07-21T08:30:05.000Z,7,1234567,30000000,25,1.5," +
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,2048"
    );
  });

  it("resolves registry identities for the primary validator, falling back to the raw hash", () => {
    const known = makeBlock({ primaryValidator: "0x1212000000000000000000000000000000000001" });
    const [, row] = buildXBlocksCsv([known], { net: "neox-mainnet" }).split("\r\n");
    expect(row.split(",")[8]).toBe("Governance");

    // Falls back to the miner address when primaryValidator is unresolved.
    const minerOnly = makeBlock({ primaryValidator: null, miner: "0xbbbb000000000000000000000000000000000000" });
    const [, minerRow] = buildXBlocksCsv([minerOnly], { net: "neox-mainnet" }).split("\r\n");
    expect(minerRow.split(",")[8]).toBe("0xbbbb000000000000000000000000000000000000");
  });

  it("leaves absent optional fields empty", () => {
    const sparse = makeBlock({ baseFeePerGas: null, burntFees: null, primaryValidator: null, timestampMs: 0 });
    const [, row] = buildXBlocksCsv([sparse], { net: "neox-mainnet" }).split("\r\n");
    expect(row).toBe("4821001,0xb10c,,7,1234567,30000000,,,,2048");
  });
});

describe("neoxExport buildXTransactionsCsv", () => {
  it("emits the exact header row", () => {
    expect(buildXTransactionsCsv([]).split("\r\n")[0]).toBe(
      "hash,block,timestamp_iso,status,method,from,to,value_gas,fee_gas,gas_price_gwei"
    );
  });

  it("maps a transaction row with 18-decimal value/fee and gwei gas price", () => {
    const [, row] = buildXTransactionsCsv([makeTx()]).split("\r\n");
    expect(row).toBe(
      "0xdeadbeef,4821001,2026-07-21T08:30:05.000Z,ok,transfer," +
        "0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222," +
        "1.23456789,0.000021,42.94"
    );
  });

  it("escapes commas, quotes and newlines in method names", () => {
    const tricky = makeTx({ method: 'swap(uint256,"exact")\nv2' });
    const csv = buildXTransactionsCsv([tricky]);
    const [, row] = csv.split("\r\n");
    expect(row).toContain('"swap(uint256,""exact"")\nv2"');
    // The embedded newline must stay inside the quoted cell, not split rows.
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("uses the created contract as the recipient for deployments", () => {
    const deploy = makeTx({ to: null, createdContract: { hash: "0xc0ffee" } });
    const [, row] = buildXTransactionsCsv([deploy]).split("\r\n");
    expect(row.split(",")[6]).toBe("0xc0ffee");
  });
});
