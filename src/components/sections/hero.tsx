import { getTranslations } from "next-intl/server";

import { getHeroStats } from "@/lib/data/catalog";
import { Eyebrow } from "@/components/common/eyebrow";
import { StatList } from "@/components/common/stat-list";
import { HeroPattern } from "@/components/common/placeholder/hero-pattern";
import { Container } from "@/components/layout/section";

export async function Hero() {
  const t = await getTranslations("hero");
  const stats = await getHeroStats();

  return (
    <section
      data-tone="deep"
      className="bg-background relative isolate overflow-hidden"
    >
      {/* Decorative layers — ported from the legacy .hero-bg / .hero-pattern /
          .hero-accent stack. Purely presentational, hidden from a11y tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-navy-mid),var(--color-navy)_60%)]" />
        <div className="absolute -top-40 -right-32 size-[36rem] rounded-full bg-[color:var(--color-cobalt)]/20 blur-3xl" />
        <div className="absolute -bottom-52 -left-24 size-[30rem] rounded-full bg-[color:var(--color-gold)]/10 blur-3xl" />

        {/*
          Blueprint motif filling the right half, which was empty at lg:
          because the hero is a single left-aligned column. Hidden below lg
          where the text uses the full width.
        */}
        <div className="absolute top-0 right-0 hidden h-full w-[46%] lg:block">
          <HeroPattern className="h-full w-full object-cover" />
        </div>
      </div>

      <Container className="py-20 sm:py-28">
        <div className="lg:max-w-[58%]">
          <Eyebrow data-enter className="mb-4">
            {t("eyebrow")}
          </Eyebrow>

          <h1
            data-enter
            style={{ "--enter-delay": 1 } as React.CSSProperties}
            className="font-heading max-w-4xl text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl"
          >
            {t("titleLead")}{" "}
            <span className="word-rotator">
              {/*
                Invisible sizer reserving the width of the longest word. The
                legacy rotator let the h1 resize on every swap, nudging CLS
                three times per cycle, forever.
              */}
              <span className="word-rotator-sizer" aria-hidden="true">
                {t("rotator.second")}
              </span>
              <em>{t("rotator.first")}</em>
              <em>{t("rotator.second")}</em>
              <em>{t("rotator.third")}</em>
            </span>
          </h1>
        </div>

        <div data-enter style={{ "--enter-delay": 2 } as React.CSSProperties}>
          <StatList stats={stats} bordered reveal={false} className="mt-14" />
        </div>
      </Container>
    </section>
  );
}
