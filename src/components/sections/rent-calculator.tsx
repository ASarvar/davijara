"use client";

import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  calculateAnnualRent,
  calculatorBounds,
  objectRates,
  regionCoefficients,
} from "@/content/calculator";
import { SelectField } from "@/components/common/select-field";
import { SurfaceCard } from "@/components/common/surface-card";
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
  const t = useTranslations("calculator");
  const [area, setArea] = useState<number>(calculatorBounds.defaultArea);
  const [typeValue, setTypeValue] = useState(objectRates[0].value);
  const [regionValue, setRegionValue] = useState(regionCoefficients[0].value);

  const type = objectRates.find((o) => o.value === typeValue) ?? objectRates[0];
  const region =
    regionCoefficients.find((r) => r.value === regionValue) ??
    regionCoefficients[0];

  const total = calculateAnnualRent(area, type.ratePerM2, region.coefficient);

  return (
    <SurfaceCard radius="xl" padding="lg">
      {/* text-base like every other card heading on the site. This was the
          only h3 at text-lg, which made the calculator look like it belonged
          to a different page. */}
      <h3 className="flex items-center gap-2.5 text-base font-semibold">
        <Calculator
          aria-hidden="true"
          className="text-accent-foreground size-5"
        />
        {t("title")}
      </h3>
      <p className="text-muted-foreground mt-1.5 text-sm">{t("lead")}</p>

      <div className="mt-7 space-y-6">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="calc-area" className="text-sm font-medium">
              {t("area")}
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
            className="w-full accent-[color:var(--color-gold)]"
          />
          <div className="text-muted-foreground mt-1 flex justify-between text-xs">
            <span>{calculatorBounds.minArea} m²</span>
            <span>{formatNumber(calculatorBounds.maxArea)} m²</span>
          </div>
        </div>

        <SelectField
          id="calc-type"
          label={t("objectType")}
          value={typeValue}
          onValueChange={setTypeValue}
          options={objectRates.map((o) => ({
            value: o.value,
            label: `${o.label} (${formatNumber(o.ratePerM2)} so'm/m²/yil)`,
          }))}
        />

        <SelectField
          id="calc-region"
          label="Hudud"
          value={regionValue}
          onValueChange={setRegionValue}
          options={regionCoefficients.map((r) => ({
            value: r.value,
            label: `${r.label} (×${r.coefficient})`,
          }))}
        />
      </div>

      <div className="border-border mt-7 rounded-xl border border-dashed p-5">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {t("result")}
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
    </SurfaceCard>
  );
}
