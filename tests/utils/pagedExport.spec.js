import { describe, expect, it, vi } from "vitest";
import { exportAllPagesToCsv } from "@/utils/pagedExport";

function makePageFetcher(pages, totalCount) {
  // pages: array of arrays; returns page i when asked in order.
  let i = 0;
  return async (limit) => {
    const rows = pages[i] || [];
    i += 1;
    return { result: rows.slice(0, limit), totalCount };
  };
}

describe("exportAllPagesToCsv", () => {
  it("walks all pages and calls exporter with the full accumulated set", async () => {
    const pages = [
      Array.from({ length: 3 }, (_, k) => ({ id: k })),
      Array.from({ length: 3 }, (_, k) => ({ id: k + 3 })),
      Array.from({ length: 1 }, () => ({ id: 6 })),
    ];
    const exporter = vi.fn();
    const r = await exportAllPagesToCsv({
      fetchPage: makePageFetcher(pages, 7),
      exporter,
      filename: "all.csv",
      pageSize: 3,
    });
    expect(r.rows).toBe(7);
    expect(r.truncated).toBe(false);
    expect(exporter).toHaveBeenCalledTimes(1);
    expect(exporter.mock.calls[0][0]).toHaveLength(7);
    expect(exporter.mock.calls[0][1]).toBe("all.csv");
  });

  it("stops at maxRows and reports truncated", async () => {
    const pages = [
      Array.from({ length: 3 }, (_, k) => ({ id: k })),
      Array.from({ length: 3 }, (_, k) => ({ id: k + 3 })),
      Array.from({ length: 3 }, (_, k) => ({ id: k + 6 })),
    ];
    const exporter = vi.fn();
    const r = await exportAllPagesToCsv({
      fetchPage: makePageFetcher(pages, 100),
      exporter,
      filename: "all.csv",
      pageSize: 3,
      maxRows: 5,
    });
    expect(r.rows).toBe(5);
    expect(r.truncated).toBe(true);
    expect(exporter.mock.calls[0][0]).toHaveLength(5);
  });

  it("reports no rows and does not call exporter when the first page is empty", async () => {
    const exporter = vi.fn();
    const r = await exportAllPagesToCsv({
      fetchPage: async () => ({ result: [], totalCount: 0 }),
      exporter,
      filename: "x.csv",
    });
    expect(r.rows).toBe(0);
    expect(exporter).not.toHaveBeenCalled();
  });

  it("invokes onPage progress callback", async () => {
    const pages = [
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }],
    ];
    const onPage = vi.fn();
    await exportAllPagesToCsv({
      fetchPage: makePageFetcher(pages, 3),
      exporter: vi.fn(),
      filename: "x.csv",
      pageSize: 2,
      onPage,
    });
    expect(onPage).toHaveBeenCalled();
    // last call should reflect all 3 rows received
    const last = onPage.mock.calls[onPage.mock.calls.length - 1];
    expect(last[0]).toBe(3);
  });

  it("stops when a short page indicates the end (no truncation)", async () => {
    const pages = [
      [{ id: 1 }, { id: 2 }], // full page (size 3 would be full, but we ask 3 and get 2)
    ];
    const exporter = vi.fn();
    const r = await exportAllPagesToCsv({
      fetchPage: makePageFetcher(pages, 2),
      exporter,
      filename: "x.csv",
      pageSize: 3,
    });
    expect(r.rows).toBe(2);
    expect(r.truncated).toBe(false);
  });

  it("clamps pageSize into [1,200]", async () => {
    const exporter = vi.fn();
    let seenLimit;
    await exportAllPagesToCsv({
      fetchPage: async (limit) => {
        seenLimit = limit;
        return { result: [], totalCount: 0 };
      },
      exporter,
      filename: "x.csv",
      pageSize: 99999,
    });
    expect(seenLimit).toBe(200);
  });
});
