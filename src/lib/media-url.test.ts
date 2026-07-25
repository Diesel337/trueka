import { describe, expect, it } from "vitest";

import { getProtectedMediaUrl, normalizeStoredMediaUrl } from "./media-url";

describe("protected media URLs", () => {
  it("encodes storage paths behind the application route", () => {
    expect(getProtectedMediaUrl("item-photos", "user/item/foto real.jpg")).toBe(
      "/api/media/item-photos/user/item/foto%20real.jpg",
    );
  });

  it("migrates legacy public Supabase URLs while preserving OAuth avatars", () => {
    expect(normalizeStoredMediaUrl(
      "https://project.supabase.co/storage/v1/object/public/profile-avatars/user/avatar.png",
      "profile-avatars",
    )).toBe("/api/media/profile-avatars/user/avatar.png");
    expect(normalizeStoredMediaUrl(
      "https://lh3.googleusercontent.com/avatar",
      "profile-avatars",
    )).toBe("https://lh3.googleusercontent.com/avatar");
  });
});
