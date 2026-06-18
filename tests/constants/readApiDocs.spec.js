import { describe, expect, it } from "vitest";

import {
  READ_API_BASE,
  READ_API_CATEGORIES,
  READ_API_ENDPOINTS,
  READ_API_RESPONSE_HEADERS,
} from "../../src/constants/readApiDocs.mjs";

describe("readApiDocs catalog", () => {
  it("exports non-empty categories, endpoints, and response headers", () => {
    expect(READ_API_CATEGORIES.length).toBeGreaterThan(0);
    expect(READ_API_ENDPOINTS.length).toBeGreaterThan(0);
    expect(READ_API_RESPONSE_HEADERS.length).toBeGreaterThan(0);
  });

  it("uses unique category keys and endpoint paths", () => {
    const categoryKeys = READ_API_CATEGORIES.map((category) => category.key);
    const endpointKeys = READ_API_ENDPOINTS.map((endpoint) => `${endpoint.method} ${endpoint.path}`);

    expect(new Set(categoryKeys).size).toBe(categoryKeys.length);
    expect(new Set(endpointKeys).size).toBe(endpointKeys.length);
  });

  it("maps every endpoint to a defined category", () => {
    const categoryKeys = new Set(READ_API_CATEGORIES.map((category) => category.key));

    for (const endpoint of READ_API_ENDPOINTS) {
      expect(categoryKeys.has(endpoint.category)).toBe(true);
    }
  });

  it("documents unique response headers with values and descriptions", () => {
    const headerKeys = READ_API_RESPONSE_HEADERS.map((header) => header.key);
    const headerNames = READ_API_RESPONSE_HEADERS.map((header) => header.name.toLowerCase());

    expect(new Set(headerKeys).size).toBe(headerKeys.length);
    expect(new Set(headerNames).size).toBe(headerNames.length);
    for (const header of READ_API_RESPONSE_HEADERS) {
      expect(header.key).toBeTruthy();
      expect(header.name).toBeTruthy();
      expect(header.values).toBeTruthy();
      expect(header.desc).toBeTruthy();
      expect(header.descKey).toBe(`apiDocsPage.responseHeaders.${header.key}.desc`);
    }
  });

  it("keeps curl examples anchored to the public read-api base", () => {
    for (const endpoint of READ_API_ENDPOINTS) {
      expect(endpoint.example).toContain(READ_API_BASE);
    }
  });
});
