/*
  Rent calculator inputs, ported from the calculator in davijara-v2.html.

  IMPORTANT: these are indicative rates, not a quotation. The legacy UI said so
  explicitly ("Natija taxminiy bo'lib, auktsion narxi farq qilishi mumkin") and
  that disclaimer is carried into the component — an estimate on a state portal
  must not read like a binding figure.

  Minimum rates are set annually by Cabinet of Ministers decree. Verify this
  table against the current decree each year, or replace it with a fetch from
  the real rates service, before treating any output as authoritative.
*/

export interface ObjectRate {
  value: string;
  label: string;
  /** So'm per m² per year. */
  ratePerM2: number;
}

export interface RegionCoefficient {
  value: string;
  label: string;
  coefficient: number;
}

export const objectRates: ObjectRate[] = [
  { value: "noturar", label: "Noturar joy binosi", ratePerM2: 245_000 },
  { value: "ofis", label: "Ofis, 1-qavat", ratePerM2: 320_000 },
  { value: "ombor", label: "Ishlab chiqarish ombori", ratePerM2: 190_000 },
  { value: "savdo", label: "Savdo maydoni", ratePerM2: 280_000 },
  { value: "mamuriy", label: "Ma'muriy bino", ratePerM2: 160_000 },
];

export const regionCoefficients: RegionCoefficient[] = [
  { value: "toshkent-shahri", label: "Toshkent shahri", coefficient: 1.0 },
  { value: "samarqand", label: "Samarqand viloyati", coefficient: 0.8 },
  { value: "fargona", label: "Farg'ona viloyati", coefficient: 0.75 },
  { value: "andijon", label: "Andijon viloyati", coefficient: 0.7 },
  { value: "namangan", label: "Namangan viloyati", coefficient: 0.65 },
  { value: "buxoro", label: "Buxoro viloyati", coefficient: 0.6 },
];

export const calculatorBounds = {
  minArea: 20,
  maxArea: 2000,
  step: 10,
  defaultArea: 150,
} as const;

/** area x rate x region coefficient. Matches the legacy arithmetic exactly. */
export function calculateAnnualRent(
  area: number,
  ratePerM2: number,
  coefficient: number,
): number {
  return Math.round(area * ratePerM2 * coefficient);
}
