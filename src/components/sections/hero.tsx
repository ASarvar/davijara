import { getTranslations } from "next-intl/server";
import { getHeroStats } from "@/lib/data/catalog";
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-navy-mid),var(--color-navy)_60%)]" />
        <div className="absolute -top-40 -right-32 size-[36rem] rounded-full bg-[color:var(--color-cobalt)]/20 blur-3xl" />
        <div className="absolute -bottom-52 -left-24 size-[30rem] rounded-full bg-[color:var(--color-gold)]/10 blur-3xl" />
      </div>

      <Container className="py-20 sm:py-28">
        <p className="text-accent-foreground mb-4 text-xs font-semibold tracking-[0.18em] uppercase">
          {t("eyebrow")}
        </p>

        <h1 className="font-heading max-w-4xl text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl">
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

        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-border border-t pt-4">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-heading text-accent-foreground block text-3xl font-semibold sm:text-4xl">
                  {stat.value}
                </span>
                <span className="text-muted-foreground mt-1.5 block text-sm">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
