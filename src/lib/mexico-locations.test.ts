import { describe, expect, it } from "vitest";

import {
  getMunicipalitiesForFilter,
  getMunicipalitiesForState,
  getMexicoStateDisplayName,
  getStateForLocationFilter,
  getZonesForState,
  guadalajaraMetroLocationValue,
  isLocationInFilter,
  isValidStateMunicipality,
  mexicoStates,
} from "./mexico-locations";

describe("Mexico location catalog", () => {
  it("includes all Mexico states and Jalisco municipalities", () => {
    expect(mexicoStates).toHaveLength(32);
    expect(getMunicipalitiesForState("Jalisco")).toContainEqual({
      code: "098",
      name: "San Pedro Tlaquepaque",
    });
    expect(isValidStateMunicipality("Jalisco", "Tlaquepaque")).toBe(true);
    expect(isValidStateMunicipality("Jalisco", "Tonalá")).toBe(true);
  });

  it("uses short public labels for long official state names", () => {
    expect(getMexicoStateDisplayName("Coahuila de Zaragoza")).toBe("Coahuila");
    expect(getMexicoStateDisplayName("Michoacán de Ocampo")).toBe("Michoacán");
    expect(getMexicoStateDisplayName("Veracruz de Ignacio de la Llave")).toBe("Veracruz");
  });

  it("keeps ZMG as the first Jalisco zone with the requested municipalities", () => {
    const [zone] = getZonesForState("Jalisco");

    expect(zone).toMatchObject({
      value: guadalajaraMetroLocationValue,
      label: "ZMG",
      state: "Jalisco",
    });
    expect(zone.municipalities).toEqual(
      expect.arrayContaining([
        "Guadalajara",
        "Zapopan",
        "Tlajomulco de Zúñiga",
        "San Pedro Tlaquepaque",
        "Tlaquepaque",
        "Tonalá",
      ]),
    );
  });

  it("filters ZMG as a Jalisco metro area", () => {
    expect(getStateForLocationFilter(guadalajaraMetroLocationValue)).toBe("Jalisco");
    expect(getMunicipalitiesForFilter("Jalisco", guadalajaraMetroLocationValue)).toEqual(
      expect.arrayContaining(["Guadalajara", "San Pedro Tlaquepaque", "Tlaquepaque", "Tonalá"]),
    );
    expect(
      isLocationInFilter(
        { state: "Jalisco", municipality: "Tonalá" },
        { municipality: guadalajaraMetroLocationValue },
      ),
    ).toBe(true);
    expect(
      isLocationInFilter(
        { state: "Oaxaca", municipality: "Santo Domingo Tonalá" },
        { municipality: guadalajaraMetroLocationValue },
      ),
    ).toBe(false);
  });
});
