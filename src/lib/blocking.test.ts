import { describe, expect, it } from "vitest";

import { filterItemsByBlockedCounterparties } from "./blocking";

describe("blocking filters", () => {
  it("removes items from any blocked counterparty", () => {
    const items = [
      { id: "item-1", ownerId: "user-visible" },
      { id: "item-2", ownerId: "user-i-blocked" },
      { id: "item-3", ownerId: "user-who-blocked-me" },
    ];

    expect(
      filterItemsByBlockedCounterparties(items, [
        "user-i-blocked",
        "user-who-blocked-me",
      ]),
    ).toEqual([{ id: "item-1", ownerId: "user-visible" }]);
  });

  it("keeps the original list when there are no blocked counterparties", () => {
    const items = [{ id: "item-1", ownerId: "user-visible" }];

    expect(filterItemsByBlockedCounterparties(items, [])).toBe(items);
  });
});
