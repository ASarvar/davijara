import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { OrgStructure } from "@/lib/data/structure";
import type { OrgUnit } from "@/types/content";

/*
  The central apparatus chart — the box-and-line diagram the source order
  itself uses, redrawn with this site's own tokens rather than the PDF's
  black-on-white.

  THE TOPOLOGY IS THE ORDER'S OWN, not a layout choice. The bar drops from the
  director into the two deputies (each with one subordinate unit) and into a
  single VERTICAL RAIL sitting between the last two columns. Nine stubs leave
  that rail — four to the left, five to the right — and every one of those
  nine units reports to the DIRECTOR, which is what the rail says.

  An earlier pass drew the four left-hand units as a chain, box connected to
  box. That was wrong: it claimed Buxgalteriya reports to Metodologiya. The
  split into the two sides is exactly `orgDirectUnits`' own order — see the
  reading notes in content/structure.ts, which record how the nine connectors
  were extracted from the PDF's vector paths — so it is taken as
  `direct.slice(0, 4)` / `direct.slice(4)` rather than re-declared here.

  NO NAMES, NO NOTES, NO "Batafsil". The order lists posts and staff counts,
  not people; the staff count is set inline as "(4)", after the source's own
  style, rather than broken into a separate row; and a node with a page is
  itself the link — a second "Batafsil" affordance inside it would give a
  keyboard user two stops to one URL.
*/

function Box({
  children,
  href,
  dashed,
  emphasis,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  dashed?: boolean;
  /** The director's box: one solid outline to mark the root of the tree. */
  emphasis?: boolean;
  className?: string;
}) {
  const cls = cn(
    "org-node bg-card relative block rounded-lg border px-4 py-3 text-sm leading-snug text-pretty transition-[border-color,box-shadow,transform] duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)] [box-shadow:var(--shadow-1)]",
    emphasis
      ? "border-outline border-2 text-center font-semibold"
      : "border-border",
    dashed && "border-outline border-dashed",
    href &&
      "hover:border-outline hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-2)]",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** Name plus the order's own staff figure, set inline as "(4)". */
async function UnitLabel({ unit }: { unit: OrgUnit }) {
  const t = await getTranslations("structure");
  return (
    <>
      {unit.name}
      {unit.staff !== undefined ? (
        <span className="text-muted-foreground italic"> ({unit.staff})</span>
      ) : null}
      {/*
        The dashed border is the source's own notation for "reports here but
        sits outside the central apparatus" — carried across visually, per
        CLAUDE.md's rule that nothing may depend on a cue only a sighted
        reader gets. Not printed as a visible caption: the operator asked for
        the chart's notes gone, and this one line stays for assistive tech
        only.
      */}
      {unit.external ? (
        <span className="sr-only"> — {t("externalNote")}</span>
      ) : null}
    </>
  );
}

function Connector({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mx-auto block w-px bg-[var(--hairline)]", className)}
    />
  );
}

export async function OrgChart({ structure }: { structure: OrgStructure }) {
  const left = structure.direct.slice(0, 4);
  const right = structure.direct.slice(4);

  return (
    <div data-reveal="fade">
      {/* Director */}
      <div className="mx-auto max-w-sm">
        <Box emphasis>{structure.head}</Box>
      </div>

      <Connector className="h-7" />

      {/*
        The bar, and the two distances that decide where it stops.

        LEFT is half a column: with three 1.5rem gaps across four columns a
        column is (100% - 4.5rem) / 4, so its centre is that over 8.

        RIGHT is the rail, which sits in the gap inside the two-column span —
        not the centre of column 4. Solving for it: the span starts at
        2(c + g) and runs to the end, so its centre is c + g + 50%, which is
        (100% - 1.5rem) / 4 in from the right edge.

        Both are styles rather than arbitrary Tailwind classes: a calc()
        inside `[…:…]` is exactly the shape that has compiled to a literal
        class NAME in this project before (see CLAUDE.md's Tailwind note).
      */}
      <div
        className="org-bar"
        style={
          {
            "--org-inset-left": "calc((100% - 4.5rem) / 8)",
            "--org-inset-right": "calc((100% - 1.5rem) / 4)",
          } as React.CSSProperties
        }
      >
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Deputies — each with the single unit reporting to them. */}
          {structure.branches.map((branch) => (
            <div key={branch.id} className="org-branch space-y-4">
              <Box emphasis>{branch.title}</Box>
              <Connector className="h-4" />
              {branch.units.map((unit) => (
                <Box key={unit.id} href={unit.href}>
                  <UnitLabel unit={unit} />
                </Box>
              ))}
            </div>
          ))}

          {/*
            The nine that report to the director. They span the last two
            columns as ONE branch, because they share one rail: the drop from
            the bar lands on this element's centre, which is the gap between
            the two lists below, which is where the rail runs. The nested grid
            repeats the outer gap so the two lists line up with columns 3 and
            4 of the grid above them.
          */}
          <div className="org-branch lg:col-span-2">
            <div className="grid gap-6 lg:grid-cols-2">
              <ul className="org-bus-left">
                {left.map((unit) => (
                  <li key={unit.id}>
                    <Box href={unit.href}>
                      <UnitLabel unit={unit} />
                    </Box>
                  </li>
                ))}
              </ul>

              <ul className="org-bus-right">
                {right.map((unit) => (
                  <li key={unit.id}>
                    <Box href={unit.href} dashed={unit.external}>
                      <UnitLabel unit={unit} />
                    </Box>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
