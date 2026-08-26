"use client";

import { useState } from "react";

import { ALL_VALUE, SelectField } from "@/components/common/select-field";

/**
 * The Hudud + Tuman pair of the search panel.
 *
 * A client island because the two fields are genuinely coupled: choosing a
 * region has to narrow the district list *at that moment*, not after a submit.
 * The first version resolved districts on the server from the region already
 * in the URL, which meant the tuman dropdown sat disabled until you had
 * searched once — you could not pick a region and a district in one go, which
 * is the only way anyone actually uses it.
 *
 * The whole region→district map is handed over as a prop instead of being
 * fetched on change. It is ~200 short strings, so it costs a few KB once and
 * removes a request, a loading state and a failure mode from the interaction.
 *
 * Two behaviours worth keeping:
 *
 * - Changing region RESETS the district. Otherwise `?hudud=buxoro` could keep
 *   `&tuman=Payariq tumani` — a Samarqand district — and return nothing at all
 *   while both dropdowns looked like a reasonable search.
 * - With no region chosen the district field is disabled and says why. The
 *   country has ~200 districts; one flat list is not a usable control, and an
 *   enabled-but-empty dropdown reads as broken.
 */
export function RegionDistrictFields({
  regions,
  districtsByRegion,
  initialRegion,
  initialDistrict,
  labels,
}: {
  regions: Array<{ value: string; label: string }>;
  districtsByRegion: Record<string, string[]>;
  initialRegion: string;
  initialDistrict: string;
  labels: {
    region: string;
    anyRegion: string;
    district: string;
    anyDistrict: string;
    regionFirst: string;
  };
}) {
  const [region, setRegion] = useState(initialRegion);

  /*
    Districts are keyed off the CURRENT region, so this list is always the one
    that belongs to what is selected — including on first render, where it
    reflects the region already in the URL.
  */
  const districts =
    region === ALL_VALUE ? [] : (districtsByRegion[region] ?? []);

  /*
    Keep the incoming district only while it belongs to the selected region.
    `district` is derived rather than stored so that a region change cannot
    leave a stale value behind in the hidden select that Radix submits.
  */
  const [district, setDistrict] = useState(initialDistrict);
  const activeDistrict = districts.includes(district) ? district : ALL_VALUE;

  return (
    <>
      <SelectField
        id="hudud"
        name="hudud"
        label={labels.region}
        value={region}
        onValueChange={(next) => {
          setRegion(next);
          setDistrict(ALL_VALUE);
        }}
        options={[{ value: ALL_VALUE, label: labels.anyRegion }, ...regions]}
      />

      <SelectField
        id="tuman"
        name="tuman"
        label={labels.district}
        value={activeDistrict}
        onValueChange={setDistrict}
        disabled={districts.length === 0}
        placeholder={labels.regionFirst}
        options={[
          { value: ALL_VALUE, label: labels.anyDistrict },
          ...districts.map((d) => ({ value: d, label: d })),
        ]}
      />
    </>
  );
}
