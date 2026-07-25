import { describe, expect, it } from "vitest";

import { normalizeInternalNext } from "./auth-redirect";

describe("normalizeInternalNext", () => {
  it("keeps internal paths with query and hash", () => {
    expect(normalizeInternalNext("/items?sort=nearby#results")).toBe(
      "/items?sort=nearby#results",
    );
  });

  it("uses the catalog as the default destination", () => {
    expect(normalizeInternalNext()).toBe("/items");
    expect(normalizeInternalNext("   ")).toBe("/items");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(normalizeInternalNext("https://example.com")).toBe("/items");
    expect(normalizeInternalNext("//example.com/path")).toBe("/items");
  });

  it("rejects backslashes and encoded separators", () => {
    expect(normalizeInternalNext("/\\example.com")).toBe("/items");
    expect(normalizeInternalNext("/%5cexample.com")).toBe("/items");
    expect(normalizeInternalNext("/%2fexample.com")).toBe("/items");
  });

  it("rejects control characters used to alter URL parsing", () => {
    expect(normalizeInternalNext("/\t/example.com")).toBe("/items");
    expect(normalizeInternalNext("/%09/example.com")).toBe("/items");
  });
});
