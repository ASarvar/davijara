import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { OrgStructure } from "@/lib/data/structure";
import type { OrgUnit } from "@/types/content";

/*
  The central apparatus chart, as a drawn TIMELINE rather than a box diagram.

  WHY A SPINE AND NOT BOXES AND LINES. A literal box diagram was built and
  taken back out: a 130-character department name does not fit in a box on a
  phone, and a tree of connectors has to be redrawn every time the grid
  rewraps. The hierarchy here is a real `<ol>`/`<ul>` nesting — three numbered
  levels down one rail — and the rail is drawn as the reader scrolls
  (`data-draw`, see `.org-rail-fill`). With no JavaScript the rail is simply
  drawn in full; a chart missing its connecting line is a chart that says
  nothing.

  NO NAMES ANYWHERE. The order lists posts and staff counts, not people, and a
  structure chart is not the place to publish who currently holds a post.

  DEPTH, NOT DECORATION. Every level marker, tile and figure is doing a job:
  the numeral says how far down the chain a unit sits, the tile gives a long
  Uzbek department name a shape to be recognised by, and the staff figure is
  the one number the source prints. Nothing is hue-only — the hover state is a
  lift plus a shadow step plus a tile fill, so it survives greyscale and high
  contrast, per the interaction rule in CLAUDE.md.
*/

/** The staff figure, set as a figure rather than hidden in a pill. */
async function StaffFigure({
  count,
  size = "md",
}: {
  count: number;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("structure");
  return (
    <span className="flex shrink-0 flex-col items-end leading-none">
      <span
        className={cn(
          "font-heading text-accent-foreground font-semibold tabular-nums",
          size === "md" ? "text-2xl" : "text-lg",
        )}
      >
        {count}
      </span>
      <span className="text-muted-foreground mt-1 text-[0.6875rem] tracking-wide uppercase">
        {t("staffShort")}
      </span>
      <span className="sr-only">{t("staff", { count })}</span>
    </span>
  );
}

/** One department. A link only when it has a page of its own. */
async function UnitCard({ unit }: { unit: OrgUnit }) {
  const t = await getTranslations("structure");

  const className = cn(
    "bg-card border-border relative flex h-full flex-col overflow-hidden rounded-xl border p-5",
    "[box-shadow:var(--shadow-1)] transition-[border-color,box-shadow,transform] duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
    "hover:border-outline hover:-translate-y-1 hover:[box-shadow:var(--shadow-2)]",
    unit.external && "border-dashed",
  );

  const body = (
    <>
      {/*
        A rule that draws itself across the top edge on hover. Additive: the
        card already lifts and deepens its shadow, so this carries no meaning
        of its own and its absence in high contrast costs nothing.
      */}
      <span
        aria-hidden="true"
        className="bg-accent-foreground absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-x-100"
      />

      <span className="mb-4 flex items-start justify-between gap-4">
        <span className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-hover:-rotate-6">
          <Icon name={unit.icon ?? "Building2"} className="size-5" />
        </span>
        {unit.staff !== undefined ? <StaffFigure count={unit.staff} /> : null}
      </span>

      <span className="text-sm font-semibold text-pretty">{unit.name}</span>

      {unit.external ? (
        <span className="border-hairline text-muted-foreground mt-3 block border-t pt-3 text-xs">
          {t("externalNote")}
        </span>
      ) : null}

      {/*
        THE WHOLE CARD IS THE LINK, and the arrow is all that says so — there
        was a "Batafsil" label here and the operator asked for it out. A second
        anchor inside a clickable card gives a keyboard user two stops to one
        URL and a mouse user a target the size of a word.
      */}
      {unit.href ? (
        <ArrowUpRight
          aria-hidden="true"
          className="text-accent-foreground absolute top-5 right-5 size-4 opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        />
      ) : null}
    </>
  );

  /*
    Two branches rather than a computed tag: next-intl's `Link` types `href` as
    required, so a conditional element type needs a cast to compile — and a
    cast here would be hiding the one thing this component must get right,
    whether a box is a link at all.
  */
  return (
    <li className="group relative" data-reveal="up">
      {unit.href ? (
        <Link href={unit.href} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

/** A numbered stop on the rail. The numeral sits ON the line. */
function Level({
  index,
  label,
  count,
  children,
}: {
  index: number;
  label: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pb-10 pl-12 last:pb-0 sm:pl-16">
      <span
        aria-hidden="true"
        className="border-outline bg-background text-accent-foreground font-heading absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border text-xs font-semibold tabular-nums sm:size-10 sm:text-sm"
      >
        {String(index).padStart(2, "0")}
      </span>

      <div
        className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"
        data-reveal="left"
      >
        <h2 className="text-base font-semibold sm:text-lg">{label}</h2>
        {count ? (
          <span className="text-muted-foreground text-sm tabular-nums">
            {count}
          </span>
        ) : null}
      </div>

      {children}
    </li>
  );
}

export async function OrgChart({ structure }: { structure: OrgStructure }) {
  const t = await getTranslations("structure");
  const internal = structure.direct.filter((u) => !u.external);
  const external = structure.direct.filter((u) => u.external);

  return (
    <div className="relative">
      {/*
        The rail. Absolutely positioned behind the levels, with the drawn fill
        as a child so the track stays visible while the fill grows down it.
        `left-4` / `sm:left-5` puts it through the centre of the numerals.
      */}
      <span
        aria-hidden="true"
        className="border-hairline absolute top-8 bottom-0 left-4 w-px border-l sm:top-10 sm:left-5"
      >
        <span
          data-draw
          className="org-rail-fill bg-accent-foreground/40 absolute inset-y-0 -left-px block w-px"
        />
      </span>

      <ol className="relative">
        {/* ── 01 · the director ─────────────────────────────────────── */}
        <Level index={1} label={t("levelHead")}>
          <div
            data-reveal="up"
            className="border-outline from-accent relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-6 sm:p-8"
          >
            {/*
              A soft accent bloom behind the title. Decorative and blurred, so
              the high-contrast stylesheet strips it (see the
              `[aria-hidden][class*="blur"]` rule in globals.css).
            */}
            <span
              aria-hidden="true"
              className="bg-accent-foreground/10 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl"
            />
            <div className="relative flex flex-wrap items-center gap-5">
              <span className="bg-accent text-accent-foreground flex size-14 shrink-0 items-center justify-center rounded-full">
                <Icon name={structure.headIcon} className="size-7" />
              </span>
              <div>
                <p className="font-heading text-2xl font-semibold sm:text-3xl">
                  {structure.head}
                </p>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {t("headNote")}
                </p>
              </div>
            </div>
          </div>
        </Level>

        {/* ── 02 · the deputies, each with the one unit under them ──── */}
        <Level
          index={2}
          label={t("levelDeputies")}
          count={t("countUnits", { count: structure.branches.length })}
        >
          <ul className="grid gap-4 lg:grid-cols-2">
            {structure.branches.map((branch) => (
              <li
                key={branch.id}
                data-reveal="up"
                className="bg-card border-border flex flex-col rounded-xl border p-5 [box-shadow:var(--shadow-1)]"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon name={branch.icon ?? "User"} className="size-5" />
                  </span>
                  <p className="font-semibold">{branch.title}</p>
                </div>

                {/*
                  The subordinate unit is INSIDE its deputy's card, not a
                  separate card joined by a line. Containment is the one
                  parent/child cue that survives every viewport width — a
                  connector between two cards is a line that has to be redrawn
                  each time the grid rewraps.
                */}
                <ul className="border-outline mt-4 space-y-3 border-l-2 pl-4">
                  {branch.units.map((unit) => (
                    <li key={unit.id}>
                      <p className="text-muted-foreground mb-1.5 text-[0.6875rem] tracking-wide uppercase">
                        {t("subordinate")}
                      </p>
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-semibold text-pretty">
                          {unit.name}
                        </p>
                        {unit.staff !== undefined ? (
                          <StaffFigure count={unit.staff} size="sm" />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Level>

        {/* ── 03 · straight to the director ─────────────────────────── */}
        <Level
          index={3}
          label={t("levelDirect")}
          count={t("countUnits", { count: internal.length })}
        >
          <p
            data-reveal="left"
            className="text-muted-foreground mb-4 max-w-2xl text-sm text-pretty"
          >
            {t("directNote")}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {internal.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </ul>

          {external.length > 0 ? (
            <ul className="mt-4 grid gap-4">
              {external.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </ul>
          ) : null}
        </Level>
      </ol>
    </div>
  );
}
