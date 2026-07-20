"use client";

import { useState } from "react";
import { Calculator, Info } from "lucide-react";

import {
  calculateAnnualRent,
  calculatorBounds,
  objectRates,
  regionCoefficients,
} from "@/content/calculator";
import { formatNumber } from "@/lib/format";

/**
 * Indicative rent calculator, ported from davijara-v2.html.
 *
 * Client-side because it recomputes as the user drags — but the arithmetic is
 * trivial and there is no network call, so it stays tiny. React Compiler
 * handles memoisation; nothing here needs useMemo.
 *
 * The result is deliberately framed as an estimate. The underlying rates are
 * set annually by decree and the final figure is determined at auction, so
 * presenting this as a firm price on a state portal would be misleading.
 */
export function RentCalculator() {
  const [area, setArea] = useState<number>(calculatorBounds.defaultArea);
  const [typeValue, setTypeValue] = useState(objectRates[0].value);
  const [regionValue, setRegionValue] = useState(regionCoefficients[0].value);

  const type = objectRates.find((o) => o.value === typeValue) ?? objectRates[0];
  const region =
    regionCoefficients.find((r) => r.value === regionValue) ??
    regionCoefficients[0];

  const total = calculateAnnualRent(area, type.ratePerM2, region.coefficient);

  const selectClass =
    "border-input bg-background text-foreground focus-visible:ring-ring w-full appearance-none rounded-md border px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none";

  return (
    <div className="border-border bg-card rounded-2xl border p-6 sm:p-8">
      <h3 className="flex items-center gap-2.5 text-lg font-semibold">
        <Calculator aria-hidden="true" className="text-accent-foreground size-5" />
        Ijara kalkulatori
      </h3>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Taxminiy yillik ijara to&apos;lovini hisoblang
      </p>

      <div className="mt-7 space-y-6">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="calc-area" className="text-sm font-medium">
              Maydon (m²)
            </label>
            <output
              htmlFor="calc-area"
              className="text-accent-foreground text-sm font-semibold"
            >
              {formatNumber(area)} m²
            </output>
          </div>
          <input
            id="calc-area"
            type="range"
            min={calculatorBounds.minArea}
            max={calculatorBounds.maxArea}
            step={calculatorBounds.step}
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
            className="accent-[color:var(--color-gold)] w-full"
          />
          <div className="text-muted-foreground mt-1 flex justify-between text-xs">
            <span>{calculatorBounds.minArea} m²</span>
            <span>{formatNumber(calculatorBounds.maxArea)} m²</span>
          </div>
        </div>

        <div>
          <label htmlFor="calc-type" className="mb-2 block text-sm font-medium">
            Obyekt turi
          </label>
          <select
            id="calc-type"
            value={typeValue}
            onChange={(e) => setTypeValue(e.target.value)}
            className={selectClass}
          >
            {objectRates.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({formatNumber(o.ratePerM2)} so&apos;m/m²/yil)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="calc-region"
            className="mb-2 block text-sm font-medium"
          >
            Hudud
          </label>
          <select
            id="calc-region"
            value={regionValue}
            onChange={(e) => setRegionValue(e.target.value)}
            className={selectClass}
          >
            {regionCoefficients.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} (×{r.coefficient})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-border mt-7 rounded-xl border border-dashed p-5">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Taxminiy yillik ijara to&apos;lovi
        </p>
        {/* aria-live so screen readers hear the recalculated figure. */}
        <p
          aria-live="polite"
          className="font-heading text-accent-foreground mt-1.5 text-3xl font-semibold"
        >
          {formatNumber(total)} so&apos;m
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {formatNumber(area)} m² × {formatNumber(type.ratePerM2)} so&apos;m ×{" "}
          {region.coefficient.toFixed(2)} (hudud koeffitsienti)
        </p>
      </div>

      {/*
        The legacy design carried this caveat in body copy. It is promoted to a
        marked note here: the number above is an estimate, the binding figure
        comes out of the auction.
      */}
      <p className="text-muted-foreground mt-4 flex gap-2 text-xs">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Natija taxminiy bo&apos;lib, rasmiy hisob-kitob emas. Yakuniy ijara
          haqi auksion natijasida belgilanadi. Eng kam stavkalar Vazirlar
          Mahkamasi qarori bilan har yili yangilanadi.
        </span>
      </p>
    </div>
  );
}
