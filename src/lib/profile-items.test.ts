import { describe, expect, it } from "vitest";

import { getProfileItemSections } from "./profile-items";
import type { Item, ItemStatus } from "./types";

function makeItem(id: string, status: ItemStatus): Item {
  return {
    id,
    ownerId: "profile-owner",
    title: `Articulo ${id}`,
    description: "Articulo de prueba para ordenar publicaciones propias.",
    knownDefects: "Sin detalles",
    condition: "used_good",
    category: {
      id: "cat-test",
      name: "Prueba",
      slug: "prueba",
    },
    city: "Guadalajara",
    state: "Jalisco",
    country: "Mexico",
    acceptsMultipleItems: false,
    acceptsOtherCities: false,
    publicTags: [],
    status,
    moderationStatus: "active",
    photoUrls: [],
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("profile item sections", () => {
  it("groups own items by product status order", () => {
    const sections = getProfileItemSections([
      makeItem("draft-1", "draft"),
      makeItem("active-1", "active"),
      makeItem("traded-1", "traded"),
      makeItem("paused-1", "paused"),
      makeItem("reserved-1", "reserved"),
    ]);

    expect(sections.map((section) => section.status)).toEqual([
      "reserved",
      "active",
      "draft",
      "paused",
      "traded",
    ]);
    expect(sections.map((section) => section.items.map((item) => item.id))).toEqual([
      ["reserved-1"],
      ["active-1"],
      ["draft-1"],
      ["paused-1"],
      ["traded-1"],
    ]);
  });

  it("keeps empty sections available for clear empty states", () => {
    const sections = getProfileItemSections([makeItem("active-1", "active")]);

    expect(sections).toHaveLength(5);
    expect(sections.find((section) => section.status === "draft")?.items).toEqual([]);
    expect(sections.find((section) => section.status === "draft")?.emptyMessage).toBeTruthy();
  });
});
