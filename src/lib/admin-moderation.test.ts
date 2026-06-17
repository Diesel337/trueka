import { describe, expect, it } from "vitest";

import { getRestoredItemState } from "./admin-moderation";

describe("admin moderation restore state", () => {
  it("restores the previous visible item state when history has it", () => {
    expect(getRestoredItemState({
      previousItemStatus: "paused",
      previousItemModerationStatus: "flagged",
    })).toEqual({
      status: "paused",
      moderationStatus: "flagged",
    });
  });

  it("falls back to active when older moderation history has no useful prior state", () => {
    expect(getRestoredItemState({
      previousItemStatus: "hidden_by_admin",
      previousItemModerationStatus: "hidden_by_admin",
    })).toEqual({
      status: "active",
      moderationStatus: "active",
    });
    expect(getRestoredItemState(null)).toEqual({
      status: "active",
      moderationStatus: "active",
    });
  });
});
