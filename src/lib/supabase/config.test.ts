import { describe, expect, it } from "vitest";

import { normalizeSupabaseUrl } from "./config";

describe("normalizeSupabaseUrl", () => {
  it("keeps the project root URL without a trailing slash", () => {
    expect(normalizeSupabaseUrl("https://example.supabase.co/")).toBe(
      "https://example.supabase.co",
    );
  });

  it("strips copied Data API paths", () => {
    expect(normalizeSupabaseUrl("https://example.supabase.co/rest/v1/")).toBe(
      "https://example.supabase.co",
    );
  });

  it("strips copied Auth API paths", () => {
    expect(normalizeSupabaseUrl("https://example.supabase.co/auth/v1")).toBe(
      "https://example.supabase.co",
    );
  });
});
