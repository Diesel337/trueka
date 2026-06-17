"use client";

import { useMemo, useState } from "react";

import {
  getCanonicalMunicipalityName,
  getMexicoStateDisplayName,
  getMunicipalitiesForState,
  getZonesForState,
  guadalajaraMetroLocationValue,
  mexicoStates,
} from "@/lib/mexico-locations";

type LocationSelectFieldsProps = {
  stateName?: string;
  municipalityName?: string;
  defaultState?: string;
  defaultMunicipality?: string;
  includeAllStates?: boolean;
  includeAllMunicipalities?: boolean;
  includeZones?: boolean;
  required?: boolean;
  hideLabels?: boolean;
  className?: string;
};

export function LocationSelectFields({
  stateName = "state",
  municipalityName = "city",
  defaultState = "Jalisco",
  defaultMunicipality = "Guadalajara",
  includeAllStates = false,
  includeAllMunicipalities = false,
  includeZones = false,
  required = true,
  hideLabels = false,
  className = "grid gap-4 md:grid-cols-2",
}: LocationSelectFieldsProps) {
  const [selectedState, setSelectedState] = useState(defaultState);
  const [selectedMunicipality, setSelectedMunicipality] = useState(
    getCanonicalMunicipalityName(defaultState, defaultMunicipality),
  );
  const municipalities = useMemo(
    () => getMunicipalitiesForState(selectedState),
    [selectedState],
  );
  const zones = includeZones ? getZonesForState(selectedState) : [];
  const labelClassName = hideLabels ? "sr-only" : "text-sm font-semibold text-stone-800";

  return (
    <div className={className}>
      <label className="grid min-w-0 gap-2">
        <span className={labelClassName}>Estado</span>
        <select
          name={stateName}
          required={required && !includeAllStates}
          value={selectedState}
          onChange={(event) => {
            const nextState = event.target.value;
            const nextZones = includeZones ? getZonesForState(nextState) : [];
            const nextMunicipalities = getMunicipalitiesForState(nextState);

            setSelectedState(nextState);

            if (!nextState) {
              setSelectedMunicipality("");
              return;
            }

            if (nextState === "Jalisco" && nextZones.some((zone) => zone.value === guadalajaraMetroLocationValue)) {
              setSelectedMunicipality(guadalajaraMetroLocationValue);
              return;
            }

            setSelectedMunicipality(includeAllMunicipalities ? "" : nextMunicipalities[0]?.name ?? "");
          }}
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          {includeAllStates ? <option value="">Todos los estados</option> : null}
          {mexicoStates.map((state) => (
            <option key={state.code} value={state.name}>
              {getMexicoStateDisplayName(state.name)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid min-w-0 gap-2">
        <span className={labelClassName}>Zona o municipio</span>
        <select
          name={municipalityName}
          required={required && !includeAllMunicipalities}
          disabled={!selectedState}
          value={selectedMunicipality}
          onChange={(event) => setSelectedMunicipality(event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 disabled:bg-stone-100 disabled:text-stone-400"
        >
          {!selectedState ? <option value="">Elige un estado</option> : null}
          {selectedState && includeAllMunicipalities && zones.length === 0 ? (
            <option value="">Todo el estado</option>
          ) : null}
          {zones.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label}
            </option>
          ))}
          {selectedState && includeAllMunicipalities && zones.length > 0 ? (
            <option value="">Todo el estado</option>
          ) : null}
          {municipalities.map((municipality) => (
            <option key={municipality.code} value={municipality.name}>
              {municipality.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
