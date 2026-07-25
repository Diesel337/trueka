import { describe, expect, it } from "vitest";

import {
  getPublicPostalCodeArea,
  getPostalCodeProximity,
  isNearbyPostalCode,
  normalizePostalCode,
} from "./postal-code-proximity";

describe("postal code proximity", () => {
  it("stores only an approximate public postal area for items", () => {
    expect(getPublicPostalCodeArea("44123")).toBe("44100");
    expect(getPublicPostalCodeArea("invalid")).toBeUndefined();
  });

  it("normalizes valid Mexican postal codes from user input", () => {
    expect(normalizePostalCode("44100")).toBe("44100");
    expect(normalizePostalCode("44 100")).toBe("44100");
    expect(normalizePostalCode("441")).toBeUndefined();
  });

  it("ranks exact and prefix matches before distant postal codes", () => {
    expect(getPostalCodeProximity("44100", "44100")).toEqual({ rank: 0, score: 100 });
    expect(getPostalCodeProximity("44130", "44100")).toEqual({ rank: 2, score: 70 });
    expect(getPostalCodeProximity("45050", "44100")).toEqual({ rank: 50, score: 0 });
  });

  it("marks nearby postal codes without treating every same-state item as nearby", () => {
    expect(isNearbyPostalCode("44130", "44100")).toBe(true);
    expect(isNearbyPostalCode("45050", "44100")).toBe(false);
    expect(isNearbyPostalCode(undefined, "44100")).toBe(false);
  });
});
