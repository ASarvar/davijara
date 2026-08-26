import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getRegions } from "@/lib/data/catalog";
import {
  activeAuctionWindow,
  AUCTION_WINDOW_KEY,
  AUCTION_WINDOWS,
  buildFilterQuery,
  getUpcomingAuctionCounts,
  getUpcomingAuctions,
  withFilters,
} from "@/lib/data/listings";
import { cn } from "@/lib/utils";
import { ActionLink } from "@/components/common/action-link";
import { CardRotator } from "@/components/common/card-rotator";
import { LotCard } from "@/components/common/lot-card";
import { Section, SectionHeader } from "@/components/layout/section";

/**
 * Where a chip link lands.
 *
 * Without it every chip would scroll the reader back to the top of the
 * homepage and leave them hunting for the control they just pressed — this
 * section sits well below the fold. `scroll-mt-24` clears the sticky header.
 */
const ANCHOR = "yaqinlashayotgan-savdolar";

/**
 * "Yaqinlashayotgan savdolar" — lots whose auction opens soon, each with a
 * live countdown, rotating three at a time.
 *
 * Four chips: 1 kun (0-1 days out), 3 kun (1-3), 5 kun (3-5) and Hammasi.
 * They are real links writing `?muddat=` into the URL, not click handlers —
 * the same choice the privileges filter makes, and for the same reasons: each
 * view is linkable, the back button behaves, and the section stays a Server
 * Component.
 *
 * The three windows are DISJOINT and ADJACENT, so a lot sits in at most one
 * and no count contains another. They cover the first five days only; Hammasi
 * is the default and applies no window at all, which is why its count is
 * larger than the three put together rather than equal to them.
 *
 * Whatever is showing, it is ordered soonest first with same-time lots
 * shuffled — see `getUpcomingAuctions` for why both halves of that matter.
 *
 * SCOPE. This strip is the only thing `?savdo=` narrows on the homepage. The
 * map above ignores it (see objects-section.tsx) because the panel there has
 * no auction-day control, so a chip would otherwise change a count with
 * nothing on screen to explain or undo it. Region and district are likewise
 * not applied here: this is a national overview device, and a reader narrowing
 * the map to one tuman is searching, not asking the country's auction calendar
 * to shrink with them. Following "Barcha obyektlar" carries the window to
 * /obyektlar, where the dropdown exists and it does filter the catalogue.
 *
 * CLAUDE.md listed live auction cards under "deliberately not ported", and
 * the reason was specific: the legacy countdowns ran off `data-end="7260"`,
 * seconds from page load, so every "JONLI" auction restarted its clock on
 * refresh and could show a bidding window for something already closed. That
 * blocker is gone — the service now supplies a real ISO `auction_date` per
 * lot, which is exactly the "server-provided end timestamp" that note asked
 * for. The countdown is derived from it and survives reloads and clock skew.
 */
export async function UpcomingAuctions({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("auctions");
  const tw = await getTranslations("auctionWindow");
  const activeWindow = activeAuctionWindow(searchParams);

  const [{ listings }, regions, counts] = await Promise.all([
    getUpcomingAuctions(12, activeWindow),
    getRegions(),
    getUpcomingAuctionCounts(),
  ]);

  /*
    Between auction rounds there may genuinely be nothing upcoming, and an
    empty grid under a heading promising auctions is worse than no section.

    But only when no window is chosen. Once one is, the section has to stay
    even with nothing in it: it carries the only control for undoing that
    choice, and removing it would strand the reader on a URL they cannot get
    out of without editing it by hand.
  */
  if (listings.length === 0 && activeWindow == null) return null;

  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  /*
    Every other active filter is preserved — `buildFilterQuery` is the single
    place that knows which keys those are — and only `savdo` is rewritten. A
    chip that dropped the reader's region would answer a different question
    from the one on screen.
  */
  const chipHref = (value: string | null) => {
    const params = buildFilterQuery(searchParams);
    if (value == null) params.delete(AUCTION_WINDOW_KEY);
    else params.set(AUCTION_WINDOW_KEY, value);
    const qs = params.toString();
    return `/${qs ? `?${qs}` : ""}#${ANCHOR}`;
  };

  /*
    Windows first, "Hammasi" last — the order the row was specified in, and it
    reads as a scale: the tightest slice on the left, everything on the right.

    Note that it is the LAST chip that is the default, not the first. That is
    fine because the active one is filled and bold rather than merely first,
    but it is the reason the row is not built with the reset at the head like
    the privileges filter's "Barchasi".
  */
  const chips: Array<{ value: string | null; label: string; count: number }> = [
    ...AUCTION_WINDOWS.map((w) => ({
      value: w.value,
      label: tw(w.labelKey),
      count: counts.byWindow[w.value] ?? 0,
    })),
    { value: null, label: tw("allWindows"), count: counts.all },
  ];

  return (
    <Section tone="deep" id={ANCHOR} className="scroll-mt-24">
      <SectionHeader
        title={t("title")}
        className="mb-6 sm:mb-8"
      />

      {/*
        Counts are printed on the chips, and that is not decoration. The one
        real risk with a window filter is pressing a chip, landing on an empty
        section, and having no way to tell a quiet week from a broken filter.
        A visible 0 answers that before the click. They come from one extra
        pass over the listing set already in memory — no further request.
      */}
      <nav aria-label={tw("filterLabel")} data-reveal="fade" className="mb-8">
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const isActive = chip.value === activeWindow;
            return (
              <li key={chip.value ?? "nearest"}>
                <Link
                  href={chipHref(chip.value)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                    /* Semantic border tokens, never raw gold: these keep the
                       gold tint in the brand palette and become solid
                       white/yellow in high-contrast mode, where an alpha-gold
                       chip outline is invisible on black. Same treatment as
                       the language chips. */
                    "border-hairline",
                    isActive
                      ? "bg-accent text-accent-foreground border-outline font-semibold"
                      : "text-muted-foreground hover:text-accent-foreground hover:border-outline",
                  )}
                >
                  {chip.label}
                  {/* Inherits the chip's own colour rather than setting its
                      own, so the count follows the active/muted state instead
                      of needing a second pair of rules. */}
                  <span className="bg-secondary rounded-full px-1.5 text-xs tabular-nums">
                    {chip.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {listings.length === 0 ? (
        <p
          data-reveal="fade"
          className="border-hairline text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm"
        >
          {tw("empty")}
        </p>
      ) : (
        /*
          The pool is a whole auction day's worth of lots (or the window's);
          the rotator shows three and cycles. Cards are built here, on the
          server — the rotator only chooses which slice is on screen, so no lot
          data crosses into the client bundle as props.
        */
        <CardRotator
          perView={3}
          interval={6}
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {listings.map((listing) => (
            <LotCard
              key={listing.id}
              listing={listing}
              regionName={regionName(listing.region)}
              countdown
            />
          ))}
        </CardRotator>
      )}
    </Section>
  );
}
