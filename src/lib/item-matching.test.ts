import { describe, expect, it } from "vitest";

import { hasInterestOverlap } from "./item-matching";
import type { Item } from "./types";

const baseItem: Item = {
  id: "item-public-tags-test",
  ownerId: "owner-public-tags-test",
  title: "Camara instantanea",
  description: "Camara funcional con detalles reales para probar matching.",
  knownDefects: "Rayones leves",
  condition: "used_good",
  category: {
    id: "cat-photo",
    name: "Fotografia",
    slug: "fotografia",
  },
  city: "Guadalajara",
  state: "Jalisco",
  country: "Mexico",
  acceptsMultipleItems: true,
  acceptsOtherCities: false,
  publicTags: [],
  privateInterestTags: [],
  status: "active",
  moderationStatus: "active",
  photoUrls: ["/window.svg"],
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("item matching", () => {
  it("matches visible item signals", () => {
    const item: Item = {
      ...baseItem,
      publicTags: [{ id: "tag-cameras", name: "Camaras", slug: "camaras" }],
    };

    expect(hasInterestOverlap(item, ["fotografia"])).toBe(true);
    expect(hasInterestOverlap(item, ["camaras"])).toBe(true);
  });

  it("does not match another user's private interest tags as public item signals", () => {
    const item: Item = {
      ...baseItem,
      category: {
        id: "cat-other",
        name: "Otros",
        slug: "otros",
      },
      privateInterestTags: [{ id: "tag-laptops", name: "Laptops", slug: "laptops" }],
    };

    expect(hasInterestOverlap(item, ["laptops"])).toBe(false);
  });
});
