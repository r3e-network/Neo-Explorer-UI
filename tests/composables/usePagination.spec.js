import { describe, it, expect } from "vitest";
import { createPaginationMixin } from "@/composables/usePagination";

describe("createPaginationMixin", () => {
  it("returns a mixin object with data, computed, watch, and methods", () => {
    const mixin = createPaginationMixin("/blocks");
    expect(mixin).toHaveProperty("data");
    expect(mixin).toHaveProperty("computed");
    expect(mixin).toHaveProperty("watch");
    expect(mixin).toHaveProperty("methods");
  });

  it("data factory returns default pagination state", () => {
    const mixin = createPaginationMixin("/blocks");
    const state = mixin.data();
    expect(state.currentPage).toBe(1);
    expect(state.pageSize).toBe(25);
    expect(state.total).toBe(0);
    expect(state.totalPages).toBe(1);
  });

  it("paginationOffset computes correct offset", () => {
    const mixin = createPaginationMixin("/blocks");
    const ctx = { currentPage: 3, pageSize: 25 };
    const offset = mixin.computed.paginationOffset.call(ctx);
    expect(offset).toBe(50);
  });

  it("paginationOffset is 0 for page 1", () => {
    const mixin = createPaginationMixin("/blocks");
    const ctx = { currentPage: 1, pageSize: 25 };
    expect(mixin.computed.paginationOffset.call(ctx)).toBe(0);
  });

  it("applyPage updates total and totalPages, returns items", () => {
    const mixin = createPaginationMixin("/blocks");
    const ctx = { total: 0, totalPages: 1, pageSize: 25 };
    const items = [{ id: 1 }, { id: 2 }];

    const result = mixin.methods.applyPage.call(ctx, 100, items);

    expect(ctx.total).toBe(100);
    expect(ctx.totalPages).toBe(4);
    expect(result).toBe(items);
  });

  it("applyPage handles zero totalCount", () => {
    const mixin = createPaginationMixin("/blocks");
    const ctx = { total: 50, totalPages: 2, pageSize: 25 };

    mixin.methods.applyPage.call(ctx, 0, []);

    expect(ctx.total).toBe(0);
    expect(ctx.totalPages).toBe(1);
  });

  it("goToPage calls router.push with correct path", () => {
    const mixin = createPaginationMixin("/blocks");
    const pushed = [];
    const ctx = {
      totalPages: 5,
      $router: { push: (path) => pushed.push(path) },
    };

    mixin.methods.goToPage.call(ctx, 3);
    expect(pushed).toEqual(["/blocks/3"]);
  });

  it("goToPage ignores out-of-range pages", () => {
    const mixin = createPaginationMixin("/blocks");
    const pushed = [];
    const ctx = {
      totalPages: 5,
      $router: { push: (path) => pushed.push(path) },
    };

    mixin.methods.goToPage.call(ctx, 0);
    mixin.methods.goToPage.call(ctx, 6);
    expect(pushed).toEqual([]);
  });

  it("changePageSize updates pageSize and navigates to page 1", () => {
    const mixin = createPaginationMixin("/transactions");
    const pushed = [];
    const ctx = {
      pageSize: 25,
      $router: { push: (path) => pushed.push(path) },
    };

    mixin.methods.changePageSize.call(ctx, 50);
    expect(ctx.pageSize).toBe(50);
    expect(pushed).toEqual(["/transactions/1"]);
  });
});
