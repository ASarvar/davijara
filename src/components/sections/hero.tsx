import { getTranslations } from "next-intl/server";

import { getHeroStats } from "@/lib/data/catalog";
import { Eyebrow } from "@/components/common/eyebrow";
import { StatList } from "@/components/common/stat-list";
import { Container } from "@/components/layout/section";

export async function Hero() {
  const t = await getTranslations("hero");
  const stats = await getHeroStats();

  return (
    <section
      data-tone="deep"
      className="bg-background relative isolate overflow-hidden"
    >
      {/* Decorative layers — ported verbatim from legacy .hero-bg /
          .hero-accent / .hero-pattern (styles.css:268-311). Purely
          presentational, hidden from the a11y tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 60% 30%, rgba(26,58,124,0.45) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(200,169,110,0.08) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-0 right-0 h-full w-[45%]"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 80% 40%, rgba(26,58,124,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(60deg, rgba(200,169,110,1) 0, rgba(200,169,110,1) 1px, transparent 0, transparent 50%), repeating-linear-gradient(120deg, rgba(200,169,110,1) 0, rgba(200,169,110,1) 1px, transparent 0, transparent 50%), repeating-linear-gradient(0deg, rgba(200,169,110,1) 0, rgba(200,169,110,1) 1px, transparent 0, transparent 50%)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <Container className="py-20 sm:py-28">
        <div className="lg:max-w-[58%]">
          <Eyebrow dot data-enter className="mb-4">
            {t("eyebrow")}
          </Eyebrow>

          <h1
            data-enter
            style={{ "--enter-delay": 1 } as React.CSSProperties}
            className="font-heading max-w-6xl text-4xl leading-[1.1] font-black text-balance sm:text-5xl lg:text-6xl"
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
          <StatList stats={stats}  reveal={false} className="mt-14" />
        </div>
      </Container>
    </section>
  );
}
