import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Section, SectionHeader, type Tone } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Styleguide — Davijara.uz",
  robots: { index: false, follow: false },
};

const brandScale = [
  { name: "navy", value: "#07102b", cls: "bg-navy" },
  { name: "navy-mid", value: "#0d1e45", cls: "bg-navy-mid" },
  { name: "cobalt", value: "#1a3a7c", cls: "bg-cobalt" },
  { name: "gold", value: "#c8a96e", cls: "bg-gold" },
  { name: "gold-light", value: "#e8d5a8", cls: "bg-gold-light" },
  { name: "gold-ink", value: "#7d6229", cls: "bg-gold-ink" },
  { name: "bone", value: "#f4f2ee", cls: "bg-bone" },
  { name: "slate", value: "#3d4a6b", cls: "bg-slate" },
];

const semanticTokens = [
  "bg-background",
  "bg-card",
  "bg-primary",
  "bg-secondary",
  "bg-muted",
  "bg-accent",
];

/** Rendered once per tone, so the two can be compared directly. */
function ToneSpecimen({ tone }: { tone: Tone }) {
  return (
    <Section tone={tone}>
      <SectionHeader
        eyebrow={`data-tone="${tone}"`}
        title={tone === "deep" ? "Deep tone (navy)" : "Light tone (bone)"}
        description="Every component below is identical markup. Only the data-tone attribute on the section wrapper differs — the semantic tokens re-bind and everything adapts."
        action={<Button variant="outline">Batafsil</Button>}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
            Semantic surfaces
          </p>
          <div className="grid grid-cols-3 gap-2">
            {semanticTokens.map((t) => (
              <div key={t} className="space-y-1">
                <div className={`${t} border-border h-12 rounded-md border`} />
                <p className="text-muted-foreground font-mono text-[10px]">
                  {t}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
            Buttons
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Kirish</Button>
            <Button variant="secondary">Ikkilamchi</Button>
            <Button variant="outline">Qidirish</Button>
            <Button variant="ghost">Ghost</Button>
          </div>

          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
            Badges
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>IT va innovatsiya</Badge>
            <Badge variant="secondary">Ta&apos;lim</Badge>
            <Badge variant="outline">Ijtimoiy himoya</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
            Typography
          </p>
          <div className="space-y-2">
            <h3 className="font-heading text-2xl font-semibold">
              Outfit — sarlavha uchun
            </h3>
            <p className="text-base">
              Inter — asosiy matn. Oʻzbek lotin alifbosi: oʻ gʻ shch ʼ — bu
              belgilar latin-ext subsetsiz notoʻgʻri koʻrsatiladi.
            </p>
            <p className="text-muted-foreground text-sm">
              Muted foreground — ikkilamchi matn uchun.
            </p>
            <p className="text-accent-foreground text-sm font-medium">
              Accent foreground — deep tonda gold, light tonda gold-ink
              (kontrast talabiga koʻra).
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Card komponenti</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Kartochka fon rangi tonga qarab avtomatik oʻzgaradi.
            </CardContent>
          </Card>

          <Accordion type="single" collapsible>
            <AccordionItem value="a">
              <AccordionTrigger>Akkordeon — imtiyoz kartasi</AccordionTrigger>
              <AccordionContent>
                Klaviatura va ARIA qoʻllab-quvvatlashi shadcn/ui primitividan
                keladi.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>Ikkinchi band</AccordionTrigger>
              <AccordionContent>Asos: PQ-239, 27.06.2024-y.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Section>
  );
}

export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <main>
      <Section tone="deep" className="pb-0">
        <p className="text-accent-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
          Davijara.uz
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Design system
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Internal reference. Not linked from the site and excluded from
          indexing.
        </p>

        <div className="mt-10">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
            Brand scale — raw values, tone-independent
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {brandScale.map((c) => (
              <div key={c.name} className="space-y-1">
                <div
                  className={`${c.cls} border-border h-16 rounded-md border`}
                />
                <p className="font-mono text-[11px]">{c.name}</p>
                <p className="text-muted-foreground font-mono text-[10px]">
                  {c.value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm">
            <strong className="text-accent-foreground">Contrast note:</strong>{" "}
            gold on bone measures 2.01:1 and fails WCAG AA outright. gold-ink
            (5.14:1) is its text-safe replacement on light surfaces; gold stays
            for ornament and for text on deep surfaces (8.37:1).
          </p>
        </div>
      </Section>

      <ToneSpecimen tone="deep" />
      <ToneSpecimen tone="light" />
    </main>
  );
}
